const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  PAYMENT_STATUS,
  ALL_PAYMENT_STATUSES,
  isValidPaymentStatus,
} = require('../constants/paymentStatus');

describe('paymentStatus', () => {
  it('includes paid and unpaid', () => {
    assert.ok(ALL_PAYMENT_STATUSES.includes('paid'));
    assert.ok(ALL_PAYMENT_STATUSES.includes('unpaid'));
    assert.equal(PAYMENT_STATUS.PAID, 'paid');
    assert.equal(PAYMENT_STATUS.UNPAID, 'unpaid');
  });

  it('validates known statuses', () => {
    assert.equal(isValidPaymentStatus('paid'), true);
    assert.equal(isValidPaymentStatus('unpaid'), true);
    assert.equal(isValidPaymentStatus('partial'), false);
  });
});
