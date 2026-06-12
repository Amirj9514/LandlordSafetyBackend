const { body, param, query } = require('express-validator');
const { ALL_PROPERTY_TYPES } = require('../../constants/propertyTypes');
const { ALL_RULE_TYPES, ALL_RULE_SCOPES } = require('../../constants/pricingRuleTypes');

const uuidParam = (name) => [param(name).isUUID().withMessage(`Invalid ${name}`)];

const propertyTypeQuery = [
  query('propertyType').optional().isIn(ALL_PROPERTY_TYPES),
];

const treeQuery = [query('propertyType').isIn(ALL_PROPERTY_TYPES)];

const createCategoryValidator = [
  body('code').trim().notEmpty(),
  body('name').trim().notEmpty(),
  body('propertyType').isIn(ALL_PROPERTY_TYPES),
  body('displayOrder').optional().isInt(),
];

const updateCategoryValidator = [
  ...uuidParam('id'),
  body('code').optional().trim().notEmpty(),
  body('name').optional().trim().notEmpty(),
  body('displayOrder').optional().isInt(),
];

const reorderCategoriesValidator = [
  body('items').isArray({ min: 1 }),
  body('items.*.id').isUUID(),
  body('items.*.displayOrder').isInt(),
];

const createServiceValidator = [
  body('categoryId').isUUID(),
  body('code').trim().notEmpty(),
  body('name').trim().notEmpty(),
  body('propertyType').isIn(ALL_PROPERTY_TYPES),
  body('pricingMode').isIn(['instant', 'quote_only', 'starts_from']),
  body('displayOrder').optional().isInt(),
  body('parentServiceId').optional({ nullable: true }).isUUID(),
  body('metadata').optional().isObject(),
  body('isActive').optional().isBoolean(),
];

const updateServiceValidator = [
  ...uuidParam('id'),
  body('categoryId').optional().isUUID(),
  body('code').optional().trim().notEmpty(),
  body('name').optional().trim().notEmpty(),
  body('pricingMode').optional().isIn(['instant', 'quote_only', 'starts_from']),
  body('displayOrder').optional().isInt(),
  body('parentServiceId').optional({ nullable: true }).isUUID(),
  body('metadata').optional().isObject(),
  body('isActive').optional().isBoolean(),
];

const setServiceActiveValidator = [
  ...uuidParam('id'),
  body('isActive').isBoolean(),
];

const serviceIdParam = uuidParam('serviceId');
const questionIdParam = [...serviceIdParam, ...uuidParam('id')];

const createQuestionValidator = [
  ...serviceIdParam,
  body('fieldKey').trim().notEmpty(),
  body('inputType').trim().notEmpty(),
  body('label').trim().notEmpty(),
  body('options').optional().isArray(),
  body('validation').optional().isObject(),
  body('conditionalLogic').optional().isObject(),
  body('sortOrder').optional().isInt(),
  body('section').optional({ nullable: true }).trim(),
];

const updateQuestionValidator = [
  ...questionIdParam,
  body('fieldKey').optional().trim().notEmpty(),
  body('inputType').optional().trim().notEmpty(),
  body('label').optional().trim().notEmpty(),
  body('options').optional().isArray(),
  body('validation').optional().isObject(),
  body('conditionalLogic').optional().isObject(),
  body('sortOrder').optional().isInt(),
  body('section').optional({ nullable: true }).trim(),
];

const reorderQuestionsValidator = [
  ...serviceIdParam,
  body('items').isArray({ min: 1 }),
  body('items.*.id').isUUID(),
  body('items.*.sortOrder').isInt(),
];

const createPricingTierValidator = [
  body('tierKey').trim().notEmpty(),
  body('label').trim().notEmpty(),
  body('serviceId').optional({ nullable: true }).isUUID(),
  body('sortOrder').optional().isInt(),
  body('isTbcByDefault').optional().isBoolean(),
  body('metadata').optional().isObject(),
];

const updatePricingTierValidator = [
  ...uuidParam('id'),
  body('tierKey').optional().trim().notEmpty(),
  body('label').optional().trim().notEmpty(),
  body('serviceId').optional({ nullable: true }).isUUID(),
  body('sortOrder').optional().isInt(),
  body('isTbcByDefault').optional().isBoolean(),
  body('metadata').optional().isObject(),
];

const createBundleValidator = [
  body('bundleKey').trim().notEmpty(),
  body('label').trim().notEmpty(),
  body('propertyType').isIn(ALL_PROPERTY_TYPES),
  body('serviceCodes').isArray({ min: 1 }),
  body('serviceCodes.*').trim().notEmpty(),
  body('discountTierKey').optional({ nullable: true }).trim(),
  body('discountAmount').optional({ nullable: true }).isFloat({ min: 0 }),
  body('exclusionGroup').optional({ nullable: true }).trim(),
  body('displayOrder').optional().isInt(),
  body('metadata').optional().isObject(),
];

const updateBundleValidator = [
  ...uuidParam('id'),
  body('bundleKey').optional().trim().notEmpty(),
  body('label').optional().trim().notEmpty(),
  body('serviceCodes').optional().isArray({ min: 1 }),
  body('discountTierKey').optional({ nullable: true }).trim(),
  body('discountAmount').optional({ nullable: true }).isFloat({ min: 0 }),
  body('exclusionGroup').optional({ nullable: true }).trim(),
  body('displayOrder').optional().isInt(),
  body('metadata').optional().isObject(),
];

const createPricingRuleValidator = [
  body('ruleKey').trim().notEmpty(),
  body('ruleType').isIn(ALL_RULE_TYPES),
  body('scope').optional().isIn(ALL_RULE_SCOPES),
  body('serviceId').optional({ nullable: true }).isUUID(),
  body('bundleId').optional({ nullable: true }).isUUID(),
  body('config').isObject(),
  body('sortOrder').optional().isInt(),
  body('isActive').optional().isBoolean(),
];

const updatePricingRuleValidator = [
  ...uuidParam('id'),
  body('ruleKey').optional().trim().notEmpty(),
  body('ruleType').optional().isIn(ALL_RULE_TYPES),
  body('scope').optional().isIn(ALL_RULE_SCOPES),
  body('serviceId').optional({ nullable: true }).isUUID(),
  body('bundleId').optional({ nullable: true }).isUUID(),
  body('config').optional().isObject(),
  body('sortOrder').optional().isInt(),
  body('isActive').optional().isBoolean(),
];

const createTopQuestionValidator = [
  body('propertyType').isIn(ALL_PROPERTY_TYPES),
  body('fieldKey').trim().notEmpty(),
  body('inputType').trim().notEmpty(),
  body('label').trim().notEmpty(),
  body('options').optional().isArray(),
  body('validation').optional().isObject(),
  body('sortOrder').optional().isInt(),
];

const updateTopQuestionValidator = [
  ...uuidParam('id'),
  body('fieldKey').optional().trim().notEmpty(),
  body('inputType').optional().trim().notEmpty(),
  body('label').optional().trim().notEmpty(),
  body('options').optional().isArray(),
  body('validation').optional().isObject(),
  body('sortOrder').optional().isInt(),
];

module.exports = {
  treeQuery,
  propertyTypeQuery,
  createCategoryValidator,
  updateCategoryValidator,
  reorderCategoriesValidator,
  createServiceValidator,
  updateServiceValidator,
  setServiceActiveValidator,
  serviceIdParam,
  createQuestionValidator,
  updateQuestionValidator,
  reorderQuestionsValidator,
  createPricingTierValidator,
  updatePricingTierValidator,
  createBundleValidator,
  updateBundleValidator,
  createPricingRuleValidator,
  updatePricingRuleValidator,
  createTopQuestionValidator,
  updateTopQuestionValidator,
};
