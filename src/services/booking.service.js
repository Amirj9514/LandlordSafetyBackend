const { sequelize, Booking, BookingLineItem, BookingAnswer, Quotation, Service, User } = require('../models');
const { PROPERTY_TYPES } = require('../constants/propertyTypes');
const { BOOKING_STATUS, isValidBookingStatus } = require('../constants/bookingStatus');
const { PAYMENT_STATUS, isValidPaymentStatus } = require('../constants/paymentStatus');
const { ROLES } = require('../constants/roles');
const { BOOKING_ACTIVITY_ACTIONS } = require('../constants/bookingActivity');
const { NOTIFICATION_TYPES } = require('../constants/notificationTypes');
const { toPublicBooking, toPublicInvoiceSummary, toTechnicianBooking } = require('../utils/bookingSerializer');
const { isAdminActor, isTechnicianActor, assertBookingAccess } = require('../utils/bookingAccess');
const activityService = require('./bookingActivity.service');
const notificationService = require('./notification.service');
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

const serializeBookingForActor = (booking, actor) => {
  if (isTechnicianActor(actor)) {
    return toTechnicianBooking(booking);
  }
  return toPublicBooking(booking);
};

const listBookings = async ({
  page = 1,
  limit = 20,
  propertyType,
  status,
  technicianId,
  paymentStatus,
  actor,
} = {}) => {
  const offset = (page - 1) * limit;
  const where = {};
  if (propertyType) where.propertyType = propertyType;
  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;

  if (isTechnicianActor(actor)) {
    where.technicianId = actor.id;
  } else if (technicianId) {
    where.technicianId = technicianId;
  }

  const { rows, count } = await Booking.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      { association: 'lineItems' },
      { association: 'resolvedRegion' },
      ...(isTechnicianActor(actor) ? [] : [{ association: 'invoice' }]),
      {
        association: 'technician',
        attributes: ['id', 'email', 'fullName', 'role', 'phoneNumber', 'isActive'],
      },
    ],
  });

  const result = {
    bookings: rows.map((b) => serializeBookingForActor(b, actor)),
    bookingsPagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  };

  if (isAdminActor(actor)) {
    const quotations = await Quotation.findAll({
      where: propertyType ? { propertyType } : {},
      limit: 50,
      order: [['createdAt', 'DESC']],
      include: ['lineItems', 'resolvedRegion'],
    });
    result.quotations = quotations;
  }

  return result;
};

const getBookingById = async (id, actor = null) => {
  if (actor) {
    await assertBookingAccess(id, actor);
  }

  const booking = await Booking.findByPk(id, { include: bookingDetailInclude });
  if (!booking) {
    const error = new Error('Booking not found');
    error.status = 404;
    throw error;
  }

  return actor ? serializeBookingForActor(booking, actor) : toPublicBooking(booking);
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

const notifyAssignment = async ({ booking, technician, actor, activity }) => {
  if (!technician) return;
  await notificationService.notifyUser({
    userId: technician.id,
    bookingId: booking.id,
    activityId: activity.id,
    type: NOTIFICATION_TYPES.BOOKING_ASSIGNED,
    title: 'New booking assigned',
    body: `${actor.fullName} assigned you booking ${booking.reference || booking.id}`,
  });
};

const notifyUnassignment = async ({ booking, previousTechnicianId, actor, activity }) => {
  if (!previousTechnicianId) return;
  await notificationService.notifyUser({
    userId: previousTechnicianId,
    bookingId: booking.id,
    activityId: activity.id,
    type: NOTIFICATION_TYPES.BOOKING_UNASSIGNED,
    title: 'Booking unassigned',
    body: `${actor.fullName} removed you from booking ${booking.reference || booking.id}`,
  });
};

const notifyStatusChange = async ({ booking, fromStatus, toStatus, actor, activity }) => {
  if (isTechnicianActor(actor)) {
    const adminIds = await notificationService.listActiveAdmins();
    await notificationService.notifyUsers(adminIds, {
      bookingId: booking.id,
      activityId: activity.id,
      type: NOTIFICATION_TYPES.STATUS_CHANGED,
      title: 'Booking status updated',
      body: `${actor.fullName} changed ${booking.reference || 'booking'} from ${fromStatus} to ${toStatus}`,
    });
  } else if (booking.technicianId) {
    await notificationService.notifyUser({
      userId: booking.technicianId,
      bookingId: booking.id,
      activityId: activity.id,
      type: NOTIFICATION_TYPES.STATUS_CHANGED,
      title: 'Booking status updated',
      body: `${actor.fullName} changed ${booking.reference || 'booking'} from ${fromStatus} to ${toStatus}`,
    });
  }
};

const notifyPaymentChange = async ({ booking, fromStatus, toStatus, actor, activity }) => {
  if (booking.technicianId) {
    await notificationService.notifyUser({
      userId: booking.technicianId,
      bookingId: booking.id,
      activityId: activity.id,
      type: NOTIFICATION_TYPES.PAYMENT_CHANGED,
      title: 'Payment status updated',
      body: `${booking.reference || 'Booking'} payment changed from ${fromStatus} to ${toStatus}`,
    });
  }
};

const notifyComment = async ({ booking, actor, activity, message }) => {
  if (isTechnicianActor(actor)) {
    const adminIds = await notificationService.listActiveAdmins();
    await notificationService.notifyUsers(adminIds, {
      bookingId: booking.id,
      activityId: activity.id,
      type: NOTIFICATION_TYPES.COMMENT_ADDED,
      title: 'New technician comment',
      body: `${actor.fullName} on ${booking.reference || 'booking'}: ${message.slice(0, 120)}`,
    });
  } else if (booking.technicianId) {
    await notificationService.notifyUser({
      userId: booking.technicianId,
      bookingId: booking.id,
      activityId: activity.id,
      type: NOTIFICATION_TYPES.COMMENT_ADDED,
      title: 'New admin comment',
      body: `${actor.fullName} on ${booking.reference || 'booking'}: ${message.slice(0, 120)}`,
    });
  }
};

const validateTechnicianUpdate = (booking, payload, actor) => {
  if (!isTechnicianActor(actor)) return;

  if (booking.technicianId !== actor.id) {
    const error = new Error('You can only update bookings assigned to you');
    error.status = 403;
    throw error;
  }

  const forbidden = [
    'technicianId',
    'paymentStatus',
    'paidAt',
    'adminNotes',
    'metadata',
    'congestionZone',
    'parkingAvailable',
  ];

  for (const key of forbidden) {
    if (payload[key] !== undefined) {
      const error = new Error(`Technicians cannot update ${key}`);
      error.status = 403;
      throw error;
    }
  }

  if (payload.status !== undefined) {
    const allowed =
      booking.status === BOOKING_STATUS.CONFIRMED && payload.status === BOOKING_STATUS.COMPLETED;
    if (!allowed) {
      const error = new Error('Technicians can only mark confirmed bookings as completed');
      error.status = 403;
      throw error;
    }
  }
};

const updateBooking = async (id, payload, actor) => {
  const booking = await assertBookingAccess(id, actor);
  validateTechnicianUpdate(booking, payload, actor);

  const updates = {};
  let meta = { ...(booking.metadata || {}) };
  const previousTechnicianId = booking.technicianId;
  let assignedTechnician = null;

  if (payload.status !== undefined) {
    if (!isValidBookingStatus(payload.status)) {
      const error = new Error('Invalid booking status');
      error.status = 400;
      throw error;
    }
    updates.status = payload.status;
    meta = appendStatusHistory(booking, payload.status, actor);
  }

  if (payload.technicianId !== undefined && isAdminActor(actor)) {
    if (payload.technicianId === null || payload.technicianId === '') {
      updates.technicianId = null;
      updates.assignedAt = null;
    } else {
      assignedTechnician = await assertTechnician(payload.technicianId);
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
      if (isTechnicianActor(actor) && field === 'adminNotes') continue;
      updates[field] = payload[field];
    }
  }

  if (payload.paymentStatus !== undefined && isAdminActor(actor)) {
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

  if (payload.metadata && typeof payload.metadata === 'object' && isAdminActor(actor)) {
    meta = { ...meta, ...payload.metadata };
  }

  const hasChanges =
    Object.keys(updates).length > 0 ||
    payload.status !== undefined ||
    payload.technicianId !== undefined ||
    payload.paymentStatus !== undefined ||
    payload.metadata !== undefined;

  if (hasChanges) {
    const previousStatus = booking.status;
    const previousPaymentStatus = booking.paymentStatus;

    updates.metadata = touchAdminMetadata(meta, actor);
    await booking.update(updates);
    await booking.reload();

    if (payload.status !== undefined && previousStatus !== payload.status) {
      const activity = await activityService.logActivity({
        bookingId: booking.id,
        actor,
        action: BOOKING_ACTIVITY_ACTIONS.STATUS_CHANGED,
        message: `Status changed from ${previousStatus} to ${payload.status}`,
        payload: { from: previousStatus, to: payload.status },
      });
      await notifyStatusChange({
        booking,
        fromStatus: previousStatus,
        toStatus: payload.status,
        actor,
        activity,
      });
    }

    if (payload.technicianId !== undefined && isAdminActor(actor)) {
      if (payload.technicianId) {
        const tech = assignedTechnician || (await User.findByPk(payload.technicianId));
        const activity = await activityService.logActivity({
          bookingId: booking.id,
          actor,
          action: BOOKING_ACTIVITY_ACTIONS.ASSIGNED,
          message: `Assigned to ${tech?.fullName || 'technician'}`,
          payload: { technicianId: payload.technicianId, technicianName: tech?.fullName },
        });
        await notifyAssignment({ booking, technician: tech, actor, activity });
      } else if (previousTechnicianId) {
        const activity = await activityService.logActivity({
          bookingId: booking.id,
          actor,
          action: BOOKING_ACTIVITY_ACTIONS.UNASSIGNED,
          message: 'Technician unassigned',
          payload: { technicianId: previousTechnicianId },
        });
        await notifyUnassignment({ booking, previousTechnicianId, actor, activity });
      }
    }

    if (
      payload.paymentStatus !== undefined &&
      isAdminActor(actor) &&
      previousPaymentStatus !== payload.paymentStatus
    ) {
      const activity = await activityService.logActivity({
        bookingId: booking.id,
        actor,
        action: BOOKING_ACTIVITY_ACTIONS.PAYMENT_CHANGED,
        message: `Payment status changed to ${payload.paymentStatus}`,
        payload: { from: previousPaymentStatus, to: payload.paymentStatus },
      });
      await notifyPaymentChange({
        booking,
        fromStatus: previousPaymentStatus,
        toStatus: payload.paymentStatus,
        actor,
        activity,
      });
    }
  }

  return getBookingById(id, actor);
};

const addBookingComment = async (bookingId, message, actor) => {
  const booking = await assertBookingAccess(bookingId, actor);
  const trimmed = (message || '').trim();
  if (!trimmed) {
    const error = new Error('Comment message is required');
    error.status = 400;
    throw error;
  }
  if (trimmed.length > 2000) {
    const error = new Error('Comment must be 2000 characters or fewer');
    error.status = 400;
    throw error;
  }

  const activity = await activityService.logActivity({
    bookingId: booking.id,
    actor,
    action: BOOKING_ACTIVITY_ACTIONS.COMMENT_ADDED,
    message: trimmed,
    payload: { comment: trimmed },
  });

  await notifyComment({ booking, actor, activity, message: trimmed });

  return activity;
};

const listBookingActivities = async (bookingId, actor, options = {}) => {
  await assertBookingAccess(bookingId, actor);
  return activityService.listByBooking(bookingId, options);
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
  addBookingComment,
  listBookingActivities,
  listTechnicians,
  createBookingInvoice,
  getBookingInvoiceMeta,
  downloadBookingInvoice,
};
