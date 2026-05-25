const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PAID: 'paid',
};

const ALL_PAYMENT_STATUSES = Object.values(PAYMENT_STATUS);

const isValidPaymentStatus = (status) => ALL_PAYMENT_STATUSES.includes(status);

module.exports = {
  PAYMENT_STATUS,
  ALL_PAYMENT_STATUSES,
  isValidPaymentStatus,
};
