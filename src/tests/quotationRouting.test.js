require('dotenv').config();
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { quoteRequiresQuotation, quoteHasUnpricedLines } = require('../services/pricing/quoteCalculator');

describe('quoteHasUnpricedLines', () => {
  it('is true for a quote-only line such as an asbestos survey over 5 bed', () => {
    const lines = [
      { isDiscount: false, quoteOnly: false, isTbc: false },
      { isDiscount: false, quoteOnly: true, isTbc: true },
    ];
    assert.equal(quoteHasUnpricedLines(lines), true);
  });

  it('ignores discount lines and fully priced baskets', () => {
    assert.equal(quoteHasUnpricedLines([{ isDiscount: true, isTbc: true }, { isDiscount: false, isTbc: false }]), false);
  });
});

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
