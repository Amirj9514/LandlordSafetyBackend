const express = require('express');
const {
  createBooking,
  createQuoteRequest,
  listBookings,
  getBooking,
  updateBooking,
  addBookingComment,
  listBookingActivities,
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
  bookingIdParam,
  createInvoiceValidator,
  addBookingCommentValidator,
  listActivitiesValidator,
} = require('../validators/booking.validator');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { requireMinRole } = require('../middleware/role.middleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.post('/', createBookingValidator, validate, createBooking);
router.post('/quote-requests', createQuoteRequestValidator, validate, createQuoteRequest);

router.use(authenticate);

// Static admin paths before /:id
router.get('/technicians/list', requireMinRole(ROLES.ADMIN), listTechnicians);

// Technician + admin shared routes
router.use(requireMinRole(ROLES.TECHNICIAN));

router.get('/', listBookingsValidator, validate, listBookings);
router.get('/:id', bookingIdParam, validate, getBooking);
router.patch('/:id', updateBookingValidator, validate, updateBooking);
router.post('/:id/comments', addBookingCommentValidator, validate, addBookingComment);
router.get('/:id/activities', listActivitiesValidator, validate, listBookingActivities);

// Admin-only invoice routes (per-route guard so order stays valid)
router.post(
  '/:id/invoice',
  requireMinRole(ROLES.ADMIN),
  createInvoiceValidator,
  validate,
  createBookingInvoice
);
router.get(
  '/:id/invoice/meta',
  requireMinRole(ROLES.ADMIN),
  bookingIdParam,
  validate,
  getBookingInvoiceMeta
);
router.get(
  '/:id/invoice',
  requireMinRole(ROLES.ADMIN),
  bookingIdParam,
  validate,
  downloadBookingInvoice
);

module.exports = router;
