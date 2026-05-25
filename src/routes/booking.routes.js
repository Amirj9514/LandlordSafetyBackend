const express = require('express');
const {
  createBooking,
  createQuoteRequest,
  listBookings,
  getBooking,
  updateBooking,
  createBookingInvoice,
  getBookingInvoiceMeta,
  downloadBookingInvoice,
  listTechnicians,
} = require('../controllers/booking.controller');
const {
  createBookingValidator,
  createQuoteRequestValidator,
  listBookingsValidator,
  updateBookingValidator,
  createInvoiceValidator,
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

router.get('/technicians/list', listTechnicians);
router.get('/', listBookingsValidator, validate, listBookings);
router.post('/:id/invoice', createInvoiceValidator, validate, createBookingInvoice);
router.get('/:id/invoice/meta', bookingIdParam, validate, getBookingInvoiceMeta);
router.get('/:id/invoice', bookingIdParam, validate, downloadBookingInvoice);
router.patch('/:id', updateBookingValidator, validate, updateBooking);
router.get('/:id', bookingIdParam, validate, getBooking);

module.exports = router;
