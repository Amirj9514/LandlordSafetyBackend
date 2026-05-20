const { sequelize, Booking, BookingLineItem, BookingAnswer, QuoteRequest, QuoteRequestAnswer, Service } = require('../models');
const { PROPERTY_TYPES, BOOKING_STATUS } = require('../constants/propertyTypes');
const { calculateQuote, inferActiveBundles } = require('./pricing/quoteCalculator');
const { resolveRegionByPostcode } = require('./pricing/regionResolver');

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
        sortOrder: i,
      },
      { transaction }
    );
  }
};

const persistAnswers = async (bookingId, services, serviceRows, transaction, Model, fkField) => {
  await Model.destroy({ where: { [fkField]: bookingId }, transaction });
  const byCode = Object.fromEntries(serviceRows.map((s) => [s.code, s]));
  for (const sel of services) {
    const svc = byCode[sel.code];
    if (!svc) continue;
    await Model.create(
      {
        [fkField]: bookingId,
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
    const error = new Error('Use POST /api/quote-requests for commercial and installation bookings');
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

  const region = await resolveRegionByPostcode(postcode);
  const serviceRows = await Service.findAll({
    where: { code: services.map((s) => s.code) },
  });

  const transaction = await sequelize.transaction();
  try {
    const booking = await Booking.create(
      {
        propertyType,
        status: BOOKING_STATUS.PENDING,
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
    await persistAnswers(
      booking.id,
      services,
      serviceRows,
      transaction,
      BookingAnswer,
      'bookingId'
    );

    await transaction.commit();

    const full = await Booking.findByPk(booking.id, {
      include: ['lineItems', 'answers', 'resolvedRegion'],
    });

    return full;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const createQuoteRequest = async (body) => {
  const {
    propertyType,
    firstName,
    lastName,
    email,
    phone,
    secondaryPhone,
    postcode,
    appointmentAddress,
    services = [],
    commercialPropertySubtype,
    congestionZone = false,
    parkingAvailable = true,
    preferredDate,
    preferredTimeSlot,
    accessProvider,
    accessArrangements,
    comment,
  } = body;

  if (propertyType === PROPERTY_TYPES.RESIDENTIAL) {
    const error = new Error('Use POST /api/bookings for residential instant bookings');
    error.status = 400;
    throw error;
  }

  const region = await resolveRegionByPostcode(postcode);
  const serviceRows = await Service.findAll({
    where: { code: services.map((s) => s.code) },
  });

  const transaction = await sequelize.transaction();
  try {
    const quoteRequest = await QuoteRequest.create(
      {
        propertyType,
        status: 'pending',
        firstName,
        lastName,
        email,
        phone,
        secondaryPhone: secondaryPhone || null,
        postcode: postcode.toUpperCase(),
        appointmentAddress,
        resolvedRegionId: region?.id ?? null,
        commercialPropertySubtype: commercialPropertySubtype || null,
        congestionZone,
        parkingAvailable,
        preferredDate: preferredDate || null,
        preferredTimeSlot: preferredTimeSlot || null,
        accessProvider: accessProvider || null,
        accessArrangements: accessArrangements || null,
        comment: comment || null,
        metadata: { submittedAt: new Date().toISOString() },
      },
      { transaction }
    );

    await persistAnswers(
      quoteRequest.id,
      services,
      serviceRows,
      transaction,
      QuoteRequestAnswer,
      'quoteRequestId'
    );

    await transaction.commit();

    return QuoteRequest.findByPk(quoteRequest.id, {
      include: ['answers', 'resolvedRegion'],
    });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const listBookings = async ({ page = 1, limit = 20, propertyType, status } = {}) => {
  const offset = (page - 1) * limit;
  const where = {};
  if (propertyType) where.propertyType = propertyType;
  if (status) where.status = status;

  const { rows, count } = await Booking.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: ['lineItems', 'resolvedRegion'],
  });

  const quoteRequests = await QuoteRequest.findAll({
    where: propertyType ? { propertyType } : {},
    limit: 50,
    order: [['createdAt', 'DESC']],
    include: ['resolvedRegion'],
  });

  return {
    bookings: rows,
    bookingsPagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    quoteRequests,
  };
};

const getBookingById = async (id) => {
  const booking = await Booking.findByPk(id, {
    include: ['lineItems', 'answers', 'resolvedRegion'],
  });
  if (!booking) {
    const error = new Error('Booking not found');
    error.status = 404;
    throw error;
  }
  return booking;
};

module.exports = {
  createBooking,
  createQuoteRequest,
  listBookings,
  getBookingById,
};
