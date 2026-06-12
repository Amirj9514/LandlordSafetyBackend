const { sequelize, Booking, BookingLineItem, BookingAnswer, Quotation, Service, User } = require('../models');
const { PROPERTY_TYPES } = require('../constants/propertyTypes');
const { BOOKING_STATUS, isValidBookingStatus } = require('../constants/bookingStatus');
const { PAYMENT_STATUS, isValidPaymentStatus } = require('../constants/paymentStatus');
const { ROLES } = require('../constants/roles');
const { toPublicBooking, toPublicInvoiceSummary } = require('../utils/bookingSerializer');
const { calculateQuote, inferActiveBundles, quoteRequiresQuotation } = require('./pricing/quoteCalculator');
const { resolveRegionByPostcode } = require('./pricing/regionResolver');
const { createQuotation } = require('./quotation.service');
const { allocateBookingReference } = require('../utils/referenceNumber');
const invoiceService = require('./invoice.service');

const persistLineItems = async (bookingId, lines, transaction) => {
  await BookingLineItem.destroy({ where: { bookingId }, transaction });
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    await BookingLineItem.create(
      {
        bookingId,
        description: line.name,
        subDescription: line.sub || null,
        quantity: line.quantity || 1,
        unitPrice: line.unitPrice,
        total: line.total,
        isTbc: line.isTbc,
        isDiscount: line.isDiscount || false,
        pricingTierId: line.pricingTierId || null,
        serviceCode: line.serviceCode || null,
        serviceName: line.serviceName || null,
        serviceDetails: line.serviceDetails || null,
        sortOrder: i,
      },
      { transaction }
    );
  }
};

const persistAnswers = async (bookingId, services, serviceRows, transaction) => {
  await BookingAnswer.destroy({ where: { bookingId }, transaction });
  const byCode = Object.fromEntries(serviceRows.map((s) => [s.code, s]));
  for (const sel of services) {
    const svc = byCode[sel.code];
    if (!svc) continue;
    await BookingAnswer.create(
      {
        bookingId,
        serviceId: svc.id,
        serviceCode: sel.code,
        answers: sel.answers || {},
      },
      { transaction }
    );
  }
};

const createBooking = async (body) => {
  const {
    propertyType = PROPERTY_TYPES.RESIDENTIAL,
    firstName,
    lastName,
    email,
    phone,
    secondaryPhone,
    postcode,
    appointmentAddress,
    services = [],
    activeBundleKeys,
    congestionZone = false,
    parkingAvailable = true,
    preferredDate,
    preferredTimeSlot,
    accessProvider,
    accessArrangements,
    comment,
  } = body;

  if (propertyType !== PROPERTY_TYPES.RESIDENTIAL) {
    const error = new Error('Use POST /api/quotations for commercial and installation');
    error.status = 400;
    throw error;
  }

  const bundles = Array.isArray(activeBundleKeys)
    ? activeBundleKeys
    : await inferActiveBundles(propertyType, services);
  const quote = await calculateQuote({
    propertyType,
    postcode,
    services,
    activeBundleKeys: bundles,
    congestionZone,
    parkingAvailable,
  });

  if (quoteRequiresQuotation(quote.lines)) {
    const error = new Error(
      'One or more services require a custom quote. Submit via POST /api/quotations instead.'
    );
    error.status = 422;
    error.code = 'REQUIRES_QUOTATION';
    throw error;
  }

  const region = await resolveRegionByPostcode(postcode);
  const serviceRows = await Service.findAll({
    where: { code: services.map((s) => s.code) },
  });

  const reference = await allocateBookingReference(Booking);

  const transaction = await sequelize.transaction();
  try {
    const booking = await Booking.create(
      {
        reference,
        propertyType,
        status: BOOKING_STATUS.PENDING,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        pricingStatus: quote.pricingStatus,
        firstName,
        lastName,
        email,
        phone,
        secondaryPhone: secondaryPhone || null,
        postcode: postcode.toUpperCase(),
        appointmentAddress,
        resolvedRegionId: region?.id ?? null,
        congestionZone,
        parkingAvailable,
        preferredDate: preferredDate || null,
        preferredTimeSlot: preferredTimeSlot || null,
        accessProvider: accessProvider || null,
        accessArrangements: accessArrangements || null,
        comment: comment || null,
        subtotal: quote.subtotal,
        vat: quote.vat,
        total: quote.total,
        activeBundleKeys: bundles,
        metadata: { quoteSnapshot: quote },
      },
      { transaction }
    );

    await persistLineItems(booking.id, quote.lines, transaction);
    await persistAnswers(booking.id, services, serviceRows, transaction);

    await transaction.commit();

    const full = await Booking.findByPk(booking.id, { include: bookingDetailInclude });
    return toPublicBooking(full);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

/** @deprecated Use createQuotation — kept as alias for POST /api/bookings/quote-requests */
const createQuoteRequest = async (body) => createQuotation(body);

const bookingDetailInclude = [
  { association: 'lineItems' },
  { association: 'answers' },
  { association: 'resolvedRegion' },
  { association: 'invoice' },
  {
    association: 'technician',
    attributes: ['id', 'email', 'fullName', 'role', 'phoneNumber', 'isActive'],
  },
];

const listBookings = async ({
  page = 1,
  limit = 20,
  propertyType,
  status,
  technicianId,
  paymentStatus,
} = {}) => {
  const offset = (page - 1) * limit;
  const where = {};
  if (propertyType) where.propertyType = propertyType;
  if (status) where.status = status;
  if (technicianId) where.technicianId = technicianId;
  if (paymentStatus) where.paymentStatus = paymentStatus;

  const { rows, count } = await Booking.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      { association: 'lineItems' },
      { association: 'resolvedRegion' },
      { association: 'invoice' },
      {
        association: 'technician',
        attributes: ['id', 'email', 'fullName', 'role', 'phoneNumber', 'isActive'],
      },
    ],
  });

  const quotations = await Quotation.findAll({
    where: propertyType ? { propertyType } : {},
    limit: 50,
    order: [['createdAt', 'DESC']],
    include: ['lineItems', 'resolvedRegion'],
  });

  return {
    bookings: rows.map(toPublicBooking),
    bookingsPagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    quotations,
  };
};

const getBookingById = async (id) => {
  const booking = await Booking.findByPk(id, { include: bookingDetailInclude });
  if (!booking) {
    const error = new Error('Booking not found');
    error.status = 404;
    throw error;
  }
  return toPublicBooking(booking);
};

const assertTechnician = async (technicianId) => {
  if (technicianId === null || technicianId === undefined) return null;

  const user = await User.findByPk(technicianId);
  if (!user || !user.isActive) {
    const error = new Error('Technician not found or inactive');
    error.status = 404;
    throw error;
  }
  if (user.role !== ROLES.TECHNICIAN) {
    const error = new Error('Assigned user must have the technician role');
    error.status = 400;
    throw error;
  }
  return user;
};

const appendStatusHistory = (booking, newStatus, actor) => {
  const meta = { ...(booking.metadata || {}) };
  const history = Array.isArray(meta.statusHistory) ? [...meta.statusHistory] : [];
  if (booking.status !== newStatus) {
    history.push({
      from: booking.status,
      to: newStatus,
      at: new Date().toISOString(),
      byUserId: actor.id,
      byUserName: actor.fullName,
      byRole: actor.role,
    });
  }
  meta.statusHistory = history;
  meta.lastUpdatedBy = {
    userId: actor.id,
    fullName: actor.fullName,
    role: actor.role,
    at: new Date().toISOString(),
  };
  return meta;
};

const touchAdminMetadata = (meta, actor) => ({
  ...meta,
  lastUpdatedBy: {
    userId: actor.id,
    fullName: actor.fullName,
    role: actor.role,
    at: new Date().toISOString(),
  },
});

const updateBooking = async (id, payload, actor) => {
  const booking = await Booking.findByPk(id);
  if (!booking) {
    const error = new Error('Booking not found');
    error.status = 404;
    throw error;
  }

  const updates = {};
  let meta = { ...(booking.metadata || {}) };

  if (payload.status !== undefined) {
    if (!isValidBookingStatus(payload.status)) {
      const error = new Error('Invalid booking status');
      error.status = 400;
      throw error;
    }
    updates.status = payload.status;
    meta = appendStatusHistory(booking, payload.status, actor);
  }

  if (payload.technicianId !== undefined) {
    if (payload.technicianId === null || payload.technicianId === '') {
      updates.technicianId = null;
      updates.assignedAt = null;
    } else {
      await assertTechnician(payload.technicianId);
      updates.technicianId = payload.technicianId;
      updates.assignedAt = new Date();
    }
  }

  const optionalFields = [
    'adminNotes',
    'appointmentAddress',
    'preferredDate',
    'preferredTimeSlot',
    'accessProvider',
    'accessArrangements',
    'comment',
    'congestionZone',
    'parkingAvailable',
  ];

  for (const field of optionalFields) {
    if (payload[field] !== undefined) {
      updates[field] = payload[field];
    }
  }

  if (payload.paymentStatus !== undefined) {
    if (!isValidPaymentStatus(payload.paymentStatus)) {
      const error = new Error('Invalid payment status');
      error.status = 400;
      throw error;
    }
    updates.paymentStatus = payload.paymentStatus;
    if (payload.paymentStatus === PAYMENT_STATUS.PAID) {
      updates.paidAt = payload.paidAt ? new Date(payload.paidAt) : new Date();
    } else {
      updates.paidAt = null;
    }
    const paymentHistory = Array.isArray(meta.paymentHistory) ? [...meta.paymentHistory] : [];
    if (booking.paymentStatus !== payload.paymentStatus) {
      paymentHistory.push({
        from: booking.paymentStatus,
        to: payload.paymentStatus,
        at: new Date().toISOString(),
        byUserId: actor.id,
        byUserName: actor.fullName,
        byRole: actor.role,
      });
    }
    meta.paymentHistory = paymentHistory;
  }

  if (payload.metadata && typeof payload.metadata === 'object') {
    meta = { ...meta, ...payload.metadata };
  }

  const hasChanges =
    Object.keys(updates).length > 0 ||
    payload.status !== undefined ||
    payload.technicianId !== undefined ||
    payload.paymentStatus !== undefined ||
    payload.metadata !== undefined;

  if (hasChanges) {
    updates.metadata = touchAdminMetadata(meta, actor);
    await booking.update(updates);
  }

  return getBookingById(id);
};

const listTechnicians = async () => {
  const rows = await User.findAll({
    where: { role: ROLES.TECHNICIAN, isActive: true },
    attributes: ['id', 'email', 'fullName', 'role', 'phoneNumber', 'isActive'],
    order: [['fullName', 'ASC']],
  });
  return rows.map((u) => u.get({ plain: true }));
};

const createBookingInvoice = async (id, options = {}) => {
  const result = await invoiceService.createOrRefreshInvoice(id, options);
  return {
    ...result,
    invoice: toPublicInvoiceSummary(result.invoice),
  };
};

const getBookingInvoiceMeta = async (id) => invoiceService.getInvoiceMeta(id);

const downloadBookingInvoice = async (id) => invoiceService.getInvoiceDownloadPayload(id);

module.exports = {
  createBooking,
  createQuoteRequest,
  listBookings,
  getBookingById,
  updateBooking,
  listTechnicians,
  createBookingInvoice,
  getBookingInvoiceMeta,
  downloadBookingInvoice,
};
