const { body, query, param } = require('express-validator');
const { ALL_PROPERTY_TYPES, PROPERTY_TYPES } = require('../constants/propertyTypes');

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

const createQuoteRequestValidator = [
  body('propertyType')
    .isIn([PROPERTY_TYPES.COMMERCIAL, PROPERTY_TYPES.INSTALLATION])
    .withMessage('propertyType must be commercial or installation'),
  ...contactFields,
  body('commercialPropertySubtype').optional().trim(),
];

const listBookingsValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('propertyType').optional().isIn(ALL_PROPERTY_TYPES),
  query('status').optional().trim(),
];

const bookingIdParam = [param('id').isUUID().withMessage('Invalid booking id')];

module.exports = {
  createBookingValidator,
  createQuoteRequestValidator,
  listBookingsValidator,
  bookingIdParam,
};
