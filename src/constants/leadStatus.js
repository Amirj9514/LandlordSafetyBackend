const LEAD_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  CONVERTED: 'converted',
  LOST: 'lost',
  CLOSED: 'closed',
};

const ALL_LEAD_STATUSES = Object.values(LEAD_STATUS);

module.exports = {
  LEAD_STATUS,
  ALL_LEAD_STATUSES,
};
