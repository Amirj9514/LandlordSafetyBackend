const PROPERTY_TYPES = {
  RESIDENTIAL: 'residential',
  COMMERCIAL: 'commercial',
  INSTALLATION: 'installation',
};

const ALL_PROPERTY_TYPES = Object.values(PROPERTY_TYPES);

const PRICING_MODES = {
  INSTANT: 'instant',
  QUOTE_ONLY: 'quote_only',
  STARTS_FROM: 'starts_from',
};

const { BOOKING_STATUS, ALL_BOOKING_STATUSES } = require('./bookingStatus');

const PRICING_STATUS = {
  PRICED: 'priced',
  PARTIAL_TBC: 'partial_tbc',
  ALL_TBC: 'all_tbc',
};

module.exports = {
  PROPERTY_TYPES,
  ALL_PROPERTY_TYPES,
  PRICING_MODES,
  BOOKING_STATUS,
  ALL_BOOKING_STATUSES,
  PRICING_STATUS,
};
