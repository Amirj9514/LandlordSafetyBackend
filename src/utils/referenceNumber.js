/** Readable charset (no 0/O, 1/I/L) — e.g. BK-X7K9QP */
const REF_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const REFERENCE_PREFIX = {
  BOOKING: 'BK',
  QUOTATION: 'QT',
  INVOICE: 'IV',
};

const randomSuffix = (length = 6) => {
  let s = '';
  for (let i = 0; i < length; i += 1) {
    s += REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)];
  }
  return s;
};

const formatReference = (prefix) => `${prefix}-${randomSuffix(6)}`;

const isValidReference = (value, prefix) => {
  if (typeof value !== 'string') return false;
  const re = new RegExp(`^${prefix}-[${REF_CHARS}]{6}$`);
  return re.test(value);
};

const allocateUniqueReference = async (Model, prefix, { field = 'reference', maxAttempts = 12 } = {}) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const reference = formatReference(prefix);
    const exists = await Model.findOne({ where: { [field]: reference } });
    if (!exists) return reference;
  }
  const error = new Error('Could not allocate unique reference number');
  error.status = 500;
  throw error;
};

const allocateBookingReference = (Booking) =>
  allocateUniqueReference(Booking, REFERENCE_PREFIX.BOOKING);

const allocateQuotationReference = (Quotation) =>
  allocateUniqueReference(Quotation, REFERENCE_PREFIX.QUOTATION);

const allocateInvoiceReference = (Invoice) =>
  allocateUniqueReference(Invoice, REFERENCE_PREFIX.INVOICE);

module.exports = {
  REFERENCE_PREFIX,
  REF_CHARS,
  formatReference,
  isValidReference,
  allocateUniqueReference,
  allocateBookingReference,
  allocateQuotationReference,
  allocateInvoiceReference,
};
