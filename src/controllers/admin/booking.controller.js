const { BookingLineItem, QuotationLineItem } = require('../../models');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const httpStatus = require('../../constants/httpStatus');
const { SUBMISSION_SOURCE } = require('../../constants/submissionSource');
const bookingService = require('../../services/booking.service');
const quotationService = require('../../services/quotation.service');

/**
 * Apply admin price overrides to booking line items.
 * priceOverrides: [{ lineIndex, unitPrice, isTbc }]
 */
const applyBookingPriceOverrides = async (bookingId, lineItems, priceOverrides) => {
  for (const override of priceOverrides) {
    const line = lineItems[override.lineIndex];
    if (!line) continue;
    const newPrice = override.unitPrice !== null && override.unitPrice !== undefined
      ? override.unitPrice
      : line.unitPrice;
    const isTbc = override.isTbc !== undefined ? override.isTbc : line.isTbc;
    await BookingLineItem.update(
      { unitPrice: newPrice, total: newPrice, isTbc },
      { where: { id: line.id } }
    );
  }
};

/**
 * Apply admin price overrides to quotation line items.
 */
const applyQuotationPriceOverrides = async (quotationId, lineItems, priceOverrides) => {
  for (const override of priceOverrides) {
    const line = lineItems[override.lineIndex];
    if (!line) continue;
    const newPrice = override.unitPrice !== null && override.unitPrice !== undefined
      ? override.unitPrice
      : line.unitPrice;
    const isTbc = override.isTbc !== undefined ? override.isTbc : line.isTbc;
    await QuotationLineItem.update(
      { unitPrice: newPrice, total: newPrice, isTbc },
      { where: { id: line.id } }
    );
  }
};

/**
 * POST /api/admin/bookings
 * Admin booking/quotation creation with extended capabilities:
 *  - submitAs: 'booking' | 'quotation'  (default auto based on propertyType)
 *  - priceOverrides: [{ lineIndex, unitPrice, isTbc }]
 *  - initialStatus: string  (for bookings, e.g. 'confirmed')
 *  - technicianId: string   (for bookings)
 *  - adminNotes: string
 */
const adminCreateBooking = asyncHandler(async (req, res) => {
  const {
    submitAs,
    priceOverrides,
    initialStatus,
    technicianId,
    adminNotes,
    propertyType = 'residential',
    ...bookingData
  } = req.body;

  const forceQuotation = submitAs === 'quotation' || propertyType !== 'residential';
  const payload = { ...bookingData, propertyType };

  let result;
  let resultType;

  if (forceQuotation) {
    result = await quotationService.createQuotation(payload, { source: SUBMISSION_SOURCE.ADMIN });
    resultType = 'quotation';

    if (Array.isArray(priceOverrides) && priceOverrides.length > 0 && result.lineItems?.length) {
      await applyQuotationPriceOverrides(result.id, result.lineItems, priceOverrides);
      result = await quotationService.getQuotationById(result.id);
    }
  } else {
    result = await bookingService.createBooking(payload, { source: SUBMISSION_SOURCE.ADMIN });
    resultType = 'booking';

    const adminPatch = {};
    if (initialStatus && initialStatus !== 'pending') adminPatch.status = initialStatus;
    if (technicianId) adminPatch.technicianId = technicianId;
    if (adminNotes) adminPatch.adminNotes = adminNotes;

    if (Object.keys(adminPatch).length > 0) {
      result = await bookingService.updateBooking(result.id, adminPatch, req.user);
    }

    if (Array.isArray(priceOverrides) && priceOverrides.length > 0 && result.lineItems?.length) {
      await applyBookingPriceOverrides(result.id, result.lineItems, priceOverrides);
      result = await bookingService.getBookingById(result.id);
    }
  }

  return sendSuccess(res, {
    data: { result, type: resultType },
    message: `${resultType === 'booking' ? 'Booking' : 'Quotation'} created successfully`,
    status: httpStatus.CREATED,
  });
});

module.exports = { adminCreateBooking };
