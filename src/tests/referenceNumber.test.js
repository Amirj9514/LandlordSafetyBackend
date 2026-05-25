const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  formatReference,
  isValidReference,
  REFERENCE_PREFIX,
} = require('../utils/referenceNumber');

describe('referenceNumber', () => {
  it('formats booking reference as BK-XXXXXX', () => {
    const ref = formatReference(REFERENCE_PREFIX.BOOKING);
    assert.match(ref, /^BK-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
  });

  it('formats quotation reference as QT-XXXXXX', () => {
    const ref = formatReference(REFERENCE_PREFIX.QUOTATION);
    assert.match(ref, /^QT-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
  });

  it('formats invoice reference as IV-XXXXXX', () => {
    const ref = formatReference(REFERENCE_PREFIX.INVOICE);
    assert.match(ref, /^IV-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
  });

  it('validates reference format', () => {
    assert.equal(isValidReference('BK-X7K9QP', REFERENCE_PREFIX.BOOKING), true);
    assert.equal(isValidReference('QT-X7K9QP', REFERENCE_PREFIX.QUOTATION), true);
    assert.equal(isValidReference('IV-X7K9QP', REFERENCE_PREFIX.INVOICE), true);
    assert.equal(isValidReference('BK-INVALID', REFERENCE_PREFIX.BOOKING), false);
  });
});
