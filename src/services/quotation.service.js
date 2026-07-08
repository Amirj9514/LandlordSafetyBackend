const {
  sequelize,
  Quotation,
  QuotationLineItem,
  QuotationAnswer,
  Booking,
  BookingLineItem,
  BookingAnswer,
  Service,
} = require('../models');
const { PROPERTY_TYPES, PRICING_STATUS } = require('../constants/propertyTypes');
const { BOOKING_STATUS } = require('../constants/bookingStatus');
const { PAYMENT_STATUS } = require('../constants/paymentStatus');
const { QUOTATION_STATUS } = require('../constants/quotationStatus');
const { vatEnabled, vatRate } = require('../config/env');
const {
  calculateQuote,
  inferActiveBundles,
  quoteRequiresQuotation,
} = require('./pricing/quoteCalculator');
const { resolveRegionByPostcode } = require('./pricing/regionResolver');
const {
  allocateBookingReference,
  allocateQuotationReference,
} = require('../utils/referenceNumber');
const { SUBMISSION_SOURCE } = require('../constants/submissionSource');
const { applySourceFilter } = require('../utils/sourceFilter');

const round2 = (n) => Math.round(n * 100) / 100;

const persistQuotationLineItems = async (quotationId, lines, transaction) => {
  await QuotationLineItem.destroy({ where: { quotationId }, transaction });
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    await QuotationLineItem.create(
      {
        quotationId,
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

const persistQuotationAnswers = async (quotationId, services, serviceRows, transaction) => {
  await QuotationAnswer.destroy({ where: { quotationId }, transaction });
  const byCode = Object.fromEntries(serviceRows.map((s) => [s.code, s]));
  for (const sel of services) {
    const svc = byCode[sel.code];
    if (!svc) continue;
    await QuotationAnswer.create(
      {
        quotationId,
        serviceId: svc.id,
        serviceCode: sel.code,
        answers: sel.answers || {},
      },
      { transaction }
    );
  }
};

const buildQuotationPayload = (body, quote, bundles, region, source = SUBMISSION_SOURCE.WEBSITE) => ({
  propertyType: body.propertyType,
  status: QUOTATION_STATUS.PENDING,
  pricingStatus: quote.pricingStatus,
  firstName: body.firstName,
  lastName: body.lastName,
  email: body.email,
  phone: body.phone,
  secondaryPhone: body.secondaryPhone || null,
  postcode: body.postcode.toUpperCase(),
  appointmentAddress: body.appointmentAddress || null,
  resolvedRegionId: region?.id ?? null,
  congestionZone: body.congestionZone ?? false,
  parkingAvailable: body.parkingAvailable ?? true,
  preferredDate: body.preferredDate || null,
  preferredTimeSlot: body.preferredTimeSlot || null,
  accessProvider: body.accessProvider || null,
  accessArrangements: body.accessArrangements || null,
  comment: body.comment || null,
  commercialPropertySubtype: body.commercialPropertySubtype || null,
  subtotal: quote.subtotal,
  vat: quote.vat,
  total: quote.total,
  activeBundleKeys: bundles,
  source,
  metadata: { quoteSnapshot: quote },
});

const createQuotation = async (body, { source = SUBMISSION_SOURCE.WEBSITE } = {}) => {
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
    activeBundleKeys,
    congestionZone = false,
    parkingAvailable = true,
    preferredDate,
    preferredTimeSlot,
    accessProvider,
    accessArrangements,
    comment,
    commercialPropertySubtype,
  } = body;

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

  const reference = await allocateQuotationReference(Quotation);

  const transaction = await sequelize.transaction();
  try {
    const quotation = await Quotation.create(
      {
        reference,
        ...buildQuotationPayload(
          {
            propertyType,
            firstName,
            lastName,
            email,
            phone,
            secondaryPhone,
            postcode,
            appointmentAddress,
            congestionZone,
            parkingAvailable,
            preferredDate,
            preferredTimeSlot,
            accessProvider,
            accessArrangements,
            comment,
            commercialPropertySubtype,
          },
          quote,
          bundles,
          region,
          source,
        ),
      },
      { transaction }
    );

    await persistQuotationLineItems(quotation.id, quote.lines, transaction);
    await persistQuotationAnswers(quotation.id, services, serviceRows, transaction);

    await transaction.commit();

    return Quotation.findByPk(quotation.id, {
      include: ['lineItems', 'answers', 'resolvedRegion'],
    });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const listQuotations = async ({ page = 1, limit = 20, propertyType, status, source } = {}) => {
  const offset = (page - 1) * limit;
  const where = {};
  if (propertyType) where.propertyType = propertyType;
  if (status) where.status = status;
  applySourceFilter(where, source);

  const { rows, count } = await Quotation.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: ['lineItems', 'resolvedRegion'],
  });

  return {
    quotations: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  };
};

const getQuotationById = async (id) => {
  const quotation = await Quotation.findByPk(id, {
    include: ['lineItems', 'answers', 'resolvedRegion', 'convertedBooking'],
  });
  if (!quotation) {
    const error = new Error('Quotation not found');
    error.status = 404;
    throw error;
  }
  return quotation;
};

const recomputeQuotationTotals = (lineItems) => {
  const priced = lineItems.filter((l) => !l.isTbc && l.total !== null);
  if (priced.length === 0 || lineItems.some((l) => l.isTbc)) {
    const partial = lineItems.reduce((sum, l) => {
      if (l.isTbc || l.total === null) return sum;
      return sum + parseFloat(l.total);
    }, 0);
    const subtotal = lineItems.some((l) => l.isTbc) ? round2(partial) : null;
    let vat = 0;
    let total = subtotal;
    if (subtotal !== null && vatEnabled) {
      vat = round2(subtotal * vatRate);
      total = round2(subtotal + vat);
    }
    const pricingStatus = lineItems.some((l) => l.isTbc)
      ? PRICING_STATUS.PARTIAL_TBC
      : PRICING_STATUS.PRICED;
    return { subtotal, vat, total, pricingStatus };
  }

  const subtotal = round2(
    lineItems.reduce((sum, l) => {
      if (l.total === null) return sum;
      return sum + parseFloat(l.total);
    }, 0)
  );
  let vat = 0;
  let total = subtotal;
  if (vatEnabled) {
    vat = round2(subtotal * vatRate);
    total = round2(subtotal + vat);
  }
  return { subtotal, vat, total, pricingStatus: PRICING_STATUS.PRICED };
};

const updateQuotationLines = async (quotationId, lineUpdates) => {
  const quotation = await getQuotationById(quotationId);
  if (quotation.status === QUOTATION_STATUS.CONVERTED) {
    const error = new Error('Cannot update lines on a converted quotation');
    error.status = 400;
    throw error;
  }

  const byId = Object.fromEntries(quotation.lineItems.map((l) => [l.id, l]));

  const transaction = await sequelize.transaction();
  try {
    for (const upd of lineUpdates) {
      const existing = byId[upd.id];
      if (!existing) continue;

      const isTbc = upd.isTbc === true || upd.unitPrice === null || upd.total === null;
      await existing.update(
        {
          unitPrice: isTbc ? null : upd.unitPrice,
          total: isTbc ? null : upd.total,
          isTbc,
          adminNotes: upd.adminNotes !== undefined ? upd.adminNotes : existing.adminNotes,
        },
        { transaction }
      );
    }

    const refreshed = await Quotation.findByPk(quotationId, {
      include: ['lineItems'],
      transaction,
    });
    const totals = recomputeQuotationTotals(refreshed.lineItems);
    const allPriced = !refreshed.lineItems.some((l) => l.isTbc);

    await refreshed.update(
      {
        ...totals,
        status: allPriced ? QUOTATION_STATUS.PRICED : QUOTATION_STATUS.PENDING,
      },
      { transaction }
    );

    await transaction.commit();
    return getQuotationById(quotationId);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const updateQuotationStatus = async (quotationId, status) => {
  const quotation = await getQuotationById(quotationId);
  if (quotation.status === QUOTATION_STATUS.CONVERTED) {
    const error = new Error('Cannot change status of a converted quotation');
    error.status = 400;
    throw error;
  }
  await quotation.update({ status });
  return getQuotationById(quotationId);
};

const convertQuotationToBooking = async (quotationId) => {
  const quotation = await getQuotationById(quotationId);

  if (quotation.status === QUOTATION_STATUS.CONVERTED) {
    const error = new Error('Quotation already converted');
    error.status = 400;
    throw error;
  }

  if (quotation.lineItems.some((l) => l.isTbc)) {
    const error = new Error('All line items must be priced before converting to a booking');
    error.status = 422;
    error.code = 'LINES_STILL_TBC';
    throw error;
  }

  const bookingReference = await allocateBookingReference(Booking);

  const transaction = await sequelize.transaction();
  try {
    const booking = await Booking.create(
      {
        reference: bookingReference,
        propertyType: quotation.propertyType,
        status: BOOKING_STATUS.PENDING,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        pricingStatus: PRICING_STATUS.PRICED,
        firstName: quotation.firstName,
        lastName: quotation.lastName,
        email: quotation.email,
        phone: quotation.phone,
        secondaryPhone: quotation.secondaryPhone,
        postcode: quotation.postcode,
        appointmentAddress: quotation.appointmentAddress,
        resolvedRegionId: quotation.resolvedRegionId,
        congestionZone: quotation.congestionZone,
        parkingAvailable: quotation.parkingAvailable,
        preferredDate: quotation.preferredDate,
        preferredTimeSlot: quotation.preferredTimeSlot,
        accessProvider: quotation.accessProvider,
        accessArrangements: quotation.accessArrangements,
        comment: quotation.comment,
        subtotal: quotation.subtotal,
        vat: quotation.vat,
        total: quotation.total,
        activeBundleKeys: quotation.activeBundleKeys || [],
        source: quotation.source || SUBMISSION_SOURCE.WEBSITE,
        metadata: {
          convertedFromQuotationId: quotation.id,
          convertedFromQuotationReference: quotation.reference,
        },
      },
      { transaction }
    );

    for (let i = 0; i < quotation.lineItems.length; i += 1) {
      const line = quotation.lineItems[i];
      await BookingLineItem.create(
        {
          bookingId: booking.id,
          description: line.description,
          subDescription: line.subDescription,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          total: line.total,
          isTbc: false,
          isDiscount: line.isDiscount,
          pricingTierId: line.pricingTierId,
          serviceCode: line.serviceCode,
          serviceName: line.serviceName,
          serviceDetails: line.serviceDetails || null,
          sortOrder: i,
        },
        { transaction }
      );
    }

    for (const ans of quotation.answers) {
      await BookingAnswer.create(
        {
          bookingId: booking.id,
          serviceId: ans.serviceId,
          serviceCode: ans.serviceCode,
          answers: ans.answers,
        },
        { transaction }
      );
    }

    await quotation.update(
      {
        status: QUOTATION_STATUS.CONVERTED,
        convertedBookingId: booking.id,
        pricingStatus: PRICING_STATUS.PRICED,
      },
      { transaction }
    );

    await transaction.commit();

    return Booking.findByPk(booking.id, {
      include: ['lineItems', 'answers', 'resolvedRegion'],
    });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

module.exports = {
  createQuotation,
  listQuotations,
  getQuotationById,
  updateQuotationLines,
  updateQuotationStatus,
  convertQuotationToBooking,
  quoteRequiresQuotation,
};
