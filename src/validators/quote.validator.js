const { body, query } = require('express-validator');
const { ALL_PROPERTY_TYPES } = require('../constants/propertyTypes');

const quotePreviewValidator = [
  body('propertyType').isIn(ALL_PROPERTY_TYPES).withMessage('Invalid propertyType'),
  body('postcode').trim().notEmpty().withMessage('postcode is required'),
  body('services').isArray({ min: 1 }).withMessage('At least one service is required'),
  body('services.*.code').trim().notEmpty(),
  body('services.*.answers').optional().isObject(),
  body('activeBundleKeys').optional().isArray(),
  body('congestionZone').optional().isBoolean(),
  body('parkingAvailable').optional().isBoolean(),
];

const regionPricesQueryValidator = [
  query('postcode').trim().notEmpty().withMessage('postcode is required'),
];

module.exports = { quotePreviewValidator, regionPricesQueryValidator };
