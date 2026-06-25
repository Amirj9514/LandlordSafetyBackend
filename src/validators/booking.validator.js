const { body, query, param } = require('express-validator');
const { ALL_PROPERTY_TYPES } = require('../constants/propertyTypes');
const { ALL_BOOKING_STATUSES } = require('../constants/bookingStatus');
const { ALL_PAYMENT_STATUSES } = require('../constants/paymentStatus');

const contactFields = [
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('phone').trim().notEmpty(),
  body('secondaryPhone').optional().trim(),
  body('postcode').trim().notEmpty(),
  body('appointmentAddress').optional().trim(),
  body('services').isArray({ min: 1 }),
  body('services.*.code').trim().notEmpty(),
  body('services.*.answers').optional().isObject(),
  body('activeBundleKeys').optional().isArray(),
  body('congestionZone').optional().isBoolean(),
  body('parkingAvailable').optional().isBoolean(),
  body('preferredDate').optional().isISO8601().toDate(),
  body('preferredTimeSlot').optional().isIn(['morning', 'afternoon']),
  body('accessProvider').optional().trim(),
  body('accessArrangements').optional().trim(),
  body('comment').optional().trim(),
];

const createBookingValidator = [...contactFields];

const { createQuotationValidator } = require('./quotation.validator');

/** Alias of createQuotationValidator for POST /api/bookings/quote-requests */
const createQuoteRequestValidator = createQuotationValidator;

const adminCreateBookingValidator = [
  ...createQuotationValidator,
  body('submitAs').optional().isIn(['booking', 'quotation']),
  body('priceOverrides').optional().isArray(),
  body('priceOverrides.*.lineIndex').isInt({ min: 0 }),
  body('priceOverrides.*.unitPrice').optional({ nullable: true }).isFloat(),
  body('priceOverrides.*.isTbc').optional().isBoolean(),
  body('initialStatus').optional().isIn(ALL_BOOKING_STATUSES),
  body('technicianId').optional({ nullable: true }).isUUID(),
  body('adminNotes').optional().isString(),
];

const bookingIdParam = [param('id').isUUID().withMessage('Invalid booking id')];

const addBookingCommentValidator = [
  ...bookingIdParam,
  body('message').trim().notEmpty().isLength({ max: 2000 }),
];

const listActivitiesValidator = [
  ...bookingIdParam,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

const listBookingsValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('propertyType').optional().isIn(ALL_PROPERTY_TYPES),
  query('status').optional().isIn(ALL_BOOKING_STATUSES),
  query('technicianId').optional().isUUID(),
  query('paymentStatus').optional().isIn(ALL_PAYMENT_STATUSES),
];

const createInvoiceValidator = [...bookingIdParam, body('force').optional().isBoolean()];

const updateBookingValidator = [
  ...bookingIdParam,
  body().custom((_, { req }) => {
    const allowed = [
      'status',
      'technicianId',
      'adminNotes',
      'appointmentAddress',
      'preferredDate',
      'preferredTimeSlot',
      'accessProvider',
      'accessArrangements',
      'comment',
      'congestionZone',
      'parkingAvailable',
      'metadata',
      'paymentStatus',
    ];
    if (!allowed.some((k) => req.body[k] !== undefined)) {
      throw new Error('At least one field is required to update a booking');
    }
    return true;
  }),
  body('status').optional().isIn(ALL_BOOKING_STATUSES),
  body('paymentStatus').optional().isIn(ALL_PAYMENT_STATUSES),
  body('technicianId').optional({ nullable: true }).isUUID(),
  body('adminNotes').optional().isString(),
  body('appointmentAddress').optional().trim(),
  body('preferredDate').optional().isISO8601().toDate(),
  body('preferredTimeSlot').optional().isIn(['morning', 'afternoon']),
  body('accessProvider').optional().trim(),
  body('accessArrangements').optional().trim(),
  body('comment').optional().trim(),
  body('congestionZone').optional().isBoolean(),
  body('parkingAvailable').optional().isBoolean(),
  body('metadata').optional().isObject(),
];

module.exports = {
  createBookingValidator,
  createQuoteRequestValidator,
  adminCreateBookingValidator,
  addBookingCommentValidator,
  listActivitiesValidator,
  listBookingsValidator,
  bookingIdParam,
  createInvoiceValidator,
  updateBookingValidator,
};
