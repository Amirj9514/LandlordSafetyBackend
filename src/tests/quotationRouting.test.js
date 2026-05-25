require('dotenv').config();
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { quoteRequiresQuotation } = require('../services/pricing/quoteCalculator');

describe('quoteRequiresQuotation', () => {
  it('returns true when a non-discount priced line is TBC', () => {
    const lines = [
      { isDiscount: false, quoteOnly: false, isTbc: true },
      { isDiscount: false, quoteOnly: false, isTbc: false },
    ];
    assert.equal(quoteRequiresQuotation(lines), true);
  });

  it('ignores discount and quote-only lines', () => {
    const lines = [
      { isDiscount: true, quoteOnly: false, isTbc: true },
      { isDiscount: false, quoteOnly: true, isTbc: true },
      { isDiscount: false, quoteOnly: false, isTbc: false },
    ];
    assert.equal(quoteRequiresQuotation(lines), false);
  });
});
