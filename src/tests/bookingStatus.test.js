const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  BOOKING_STATUS,
  ALL_BOOKING_STATUSES,
  isValidBookingStatus,
} = require('../constants/bookingStatus');

describe('bookingStatus', () => {
  it('includes completed status', () => {
    assert.ok(ALL_BOOKING_STATUSES.includes('completed'));
    assert.equal(BOOKING_STATUS.COMPLETED, 'completed');
  });

  it('validates known statuses', () => {
    assert.equal(isValidBookingStatus('pending'), true);
    assert.equal(isValidBookingStatus('invalid'), false);
  });
});
