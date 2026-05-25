const QUOTATION_STATUS = {
  PENDING: 'pending',
  PRICED: 'priced',
  CONVERTED: 'converted',
  CLOSED: 'closed',
};

const ALL_QUOTATION_STATUSES = Object.values(QUOTATION_STATUS);

module.exports = { QUOTATION_STATUS, ALL_QUOTATION_STATUSES };
