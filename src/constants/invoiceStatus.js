const INVOICE_STATUS = {
  READY: 'ready',
  GENERATING: 'generating',
  FAILED: 'failed',
  MISSING: 'missing',
};

const ALL_INVOICE_STATUSES = Object.values(INVOICE_STATUS);

const isValidInvoiceStatus = (value) => ALL_INVOICE_STATUSES.includes(value);

module.exports = {
  INVOICE_STATUS,
  ALL_INVOICE_STATUSES,
  isValidInvoiceStatus,
};
