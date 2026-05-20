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

module.exports = {
  createBooking,
  createQuoteRequest,
  listBookings,
  getBooking,
};
