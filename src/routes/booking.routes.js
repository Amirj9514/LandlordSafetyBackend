const express = require('express');
const {
  createBooking,
  createQuoteRequest,
  listBookings,
  getBooking,
} = require('../controllers/booking.controller');
const {
  createBookingValidator,
  createQuoteRequestValidator,
  listBookingsValidator,
} = require('../validators/booking.validator');
const { bookingIdParam } = require('../validators/booking.validator');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { requireMinRole } = require('../middleware/role.middleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.post('/', createBookingValidator, validate, createBooking);
router.post('/quote-requests', createQuoteRequestValidator, validate, createQuoteRequest);

router.use(authenticate);
router.use(requireMinRole(ROLES.ADMIN));

router.get('/', listBookingsValidator, validate, listBookings);
router.get('/:id', bookingIdParam, validate, getBooking);

module.exports = router;
