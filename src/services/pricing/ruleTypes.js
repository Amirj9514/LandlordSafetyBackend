const { ALL_RULE_TYPES, RULE_SCOPES } = require('../../constants/pricingRuleTypes');

const REQUIRED_CONFIG_KEYS = {
  option_tier_lookup: ['fieldKey'],
  tier_key_template: ['fieldKey', 'template'],
  base_plus_increment: ['fieldKey', 'baseTierKey', 'extraTierKey'],
  multi_field_sum: ['components'],
  flat_plus_extra_units: ['fieldKey', 'flatTierKey', 'extraTierKey'],
  conditional_addon: ['when', 'tierKey'],
  tier_range_map: ['ranges'],
  bundle_discount: ['discountTierKey'],
  booking_surcharge: ['tierKey', 'lineName'],
  quote_only: [],
  starts_from: [],
  force_tbc: ['when'],
};

const validateRuleConfig = (ruleType, config = {}) => {
  if (!ALL_RULE_TYPES.includes(ruleType)) {
    return `Invalid ruleType: ${ruleType}`;
  }
  const required = REQUIRED_CONFIG_KEYS[ruleType] || [];
  for (const key of required) {
    if (config[key] === undefined || config[key] === null) {
      return `Missing required config key "${key}" for ruleType ${ruleType}`;
    }
  }
  if (ruleType === 'bundle_discount' && !config.discountTierKey && !config.discountTierKeyFromField) {
    return 'bundle_discount requires discountTierKey or discountTierKeyFromField';
  }
  return null;
};

const validateRuleScope = (scope, ruleType) => {
  if (!RULE_SCOPES || !Object.values(RULE_SCOPES).includes(scope)) {
    return `Invalid scope: ${scope}`;
  }
  if (ruleType === 'bundle_discount' && scope !== 'bundle_discount') {
    return 'bundle_discount rules must use scope bundle_discount';
  }
  if (ruleType === 'booking_surcharge' && scope !== 'booking_surcharge') {
    return 'booking_surcharge rules must use scope booking_surcharge';
  }
  return null;
};

module.exports = {
  REQUIRED_CONFIG_KEYS,
  validateRuleConfig,
  validateRuleScope,
};
