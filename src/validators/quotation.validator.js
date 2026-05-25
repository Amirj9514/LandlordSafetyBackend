const { body, query, param } = require('express-validator');
const { ALL_PROPERTY_TYPES } = require('../constants/propertyTypes');
const { ALL_QUOTATION_STATUSES } = require('../constants/quotationStatus');

const contactFields = [
  body('propertyType').isIn(ALL_PROPERTY_TYPES).withMessage('Invalid propertyType'),
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
  body('commercialPropertySubtype').optional().trim(),
];

const createQuotationValidator = [...contactFields];

const listQuotationsValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('propertyType').optional().isIn(ALL_PROPERTY_TYPES),
  query('status').optional().isIn(ALL_QUOTATION_STATUSES),
];

const quotationIdParam = [param('id').isUUID().withMessage('Invalid quotation id')];

const updateQuotationLinesValidator = [
  ...quotationIdParam,
  body('lines').isArray({ min: 1 }),
  body('lines.*.id').isUUID(),
  body('lines.*.unitPrice').optional({ nullable: true }).isFloat(),
  body('lines.*.total').optional({ nullable: true }).isFloat(),
  body('lines.*.isTbc').optional().isBoolean(),
  body('lines.*.adminNotes').optional().isString(),
];

const updateQuotationStatusValidator = [
  ...quotationIdParam,
  body('status').isIn(ALL_QUOTATION_STATUSES),
];

module.exports = {
  createQuotationValidator,
  listQuotationsValidator,
  quotationIdParam,
  updateQuotationLinesValidator,
  updateQuotationStatusValidator,
};
