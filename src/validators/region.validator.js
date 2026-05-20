const { body, param } = require('express-validator');

const regionIdParam = [param('id').isUUID().withMessage('Invalid region id')];

const createRegionValidator = [
  body('name').trim().notEmpty(),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt(),
];

const updateRegionValidator = [
  ...regionIdParam,
  body('name').optional().trim().notEmpty(),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt(),
];

const replacePrefixesValidator = [
  ...regionIdParam,
  body('prefixes').isArray().withMessage('prefixes must be an array'),
  body('prefixes.*').trim().notEmpty(),
];

const upsertPricesValidator = [
  ...regionIdParam,
  body('prices').isArray({ min: 1 }),
  body('prices.*.tierKey').optional().trim(),
  body('prices.*.pricingTierId').optional().isUUID(),
  body('prices.*.amount').optional({ nullable: true }).isFloat({ min: 0 }),
];

module.exports = {
  regionIdParam,
  createRegionValidator,
  updateRegionValidator,
  replacePrefixesValidator,
  upsertPricesValidator,
};
