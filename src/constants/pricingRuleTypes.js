const RULE_TYPES = {
  OPTION_TIER_LOOKUP: 'option_tier_lookup',
  TIER_KEY_TEMPLATE: 'tier_key_template',
  BASE_PLUS_INCREMENT: 'base_plus_increment',
  MULTI_FIELD_SUM: 'multi_field_sum',
  FLAT_PLUS_EXTRA_UNITS: 'flat_plus_extra_units',
  CONDITIONAL_ADDON: 'conditional_addon',
  TIER_RANGE_MAP: 'tier_range_map',
  BUNDLE_DISCOUNT: 'bundle_discount',
  BOOKING_SURCHARGE: 'booking_surcharge',
  QUOTE_ONLY: 'quote_only',
  STARTS_FROM: 'starts_from',
  FORCE_TBC: 'force_tbc',
};

const ALL_RULE_TYPES = Object.values(RULE_TYPES);

const RULE_SCOPES = {
  SERVICE_LINE: 'service_line',
  ADDON: 'addon',
  BUNDLE_DISCOUNT: 'bundle_discount',
  BOOKING_SURCHARGE: 'booking_surcharge',
};

const ALL_RULE_SCOPES = Object.values(RULE_SCOPES);

module.exports = {
  RULE_TYPES,
  ALL_RULE_TYPES,
  RULE_SCOPES,
  ALL_RULE_SCOPES,
};
