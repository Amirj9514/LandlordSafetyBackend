const { query } = require('express-validator');
const { ALL_PROPERTY_TYPES } = require('../constants/propertyTypes');

const catalogQueryValidator = [
  query('propertyType')
    .notEmpty()
    .withMessage('propertyType is required')
    .isIn(ALL_PROPERTY_TYPES)
    .withMessage('Invalid propertyType'),
  query('postcode').optional().trim().notEmpty().withMessage('postcode cannot be empty'),
];

module.exports = { catalogQueryValidator };
