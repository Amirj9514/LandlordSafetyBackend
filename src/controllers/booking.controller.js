const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const httpStatus = require('../constants/httpStatus');
const bookingService = require('../services/booking.service');

const createBooking = asyncHandler(async (req, res) => {
  const data = await bookingService.createBooking(req.body);
  return sendSuccess(res, {
    data,
    message: 'Booking created successfully',
    status: httpStatus.CREATED,
  });
});

const createQuoteRequest = asyncHandler(async (req, res) => {
  const data = await bookingService.createQuoteRequest(req.body);
  return sendSuccess(res, {
    data,
    message: 'Quote request submitted successfully',
    status: httpStatus.CREATED,
  });
});

const listBookings = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const data = await bookingService.listBookings({
    page,
    limit,
    propertyType: req.query.propertyType,
    status: req.query.status,
    technicianId: req.query.technicianId,
    paymentStatus: req.query.paymentStatus,
  });
  return sendSuccess(res, {
    data,
    message: 'Bookings fetched successfully',
    status: httpStatus.OK,
  });
});

const getBooking = asyncHandler(async (req, res) => {
  const data = await bookingService.getBookingById(req.params.id);
  return sendSuccess(res, {
    data,
    message: 'Booking fetched successfully',
    status: httpStatus.OK,
  });
});

const updateBooking = asyncHandler(async (req, res) => {
  const data = await bookingService.updateBooking(req.params.id, req.body, req.user);
  return sendSuccess(res, {
    data,
    message: 'Booking updated successfully',
    status: httpStatus.OK,
  });
});

const createBookingInvoice = asyncHandler(async (req, res) => {
  const { invoice, generated } = await bookingService.createBookingInvoice(req.params.id, {
    force: req.body.force === true,
  });

  return sendSuccess(res, {
    data: invoice,
    message: generated ? 'Invoice generated successfully' : 'Invoice already available',
    status: generated ? httpStatus.CREATED : httpStatus.OK,
  });
});

const getBookingInvoiceMeta = asyncHandler(async (req, res) => {
  const data = await bookingService.getBookingInvoiceMeta(req.params.id);
  return sendSuccess(res, {
    data,
    message: 'Invoice metadata fetched successfully',
    status: httpStatus.OK,
  });
});

const downloadBookingInvoice = asyncHandler(async (req, res) => {
  const data = await bookingService.downloadBookingInvoice(req.params.id);
  res.setHeader('Content-Type', data.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${data.fileName}"`);
  return res.status(httpStatus.OK).send(data.buffer);
});

const listTechnicians = asyncHandler(async (_req, res) => {
  const data = await bookingService.listTechnicians();
  return sendSuccess(res, {
    data,
    message: 'Technicians fetched successfully',
    status: httpStatus.OK,
  });
});

module.exports = {
  createBooking,
  createQuoteRequest,
  listBookings,
  getBooking,
  updateBooking,
  createBookingInvoice,
  getBookingInvoiceMeta,
  downloadBookingInvoice,
  listTechnicians,
};
