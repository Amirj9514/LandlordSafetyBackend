const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizePostcode,
  buildPrefixCandidates,
} = require('../services/pricing/regionResolver');

describe('regionResolver', () => {
  it('normalizes UK postcodes', () => {
    const r = normalizePostcode('sw1a1aa');
    assert.equal(r.formatted, 'SW1A 1AA');
    assert.equal(r.outward, 'SW1A');
  });

  it('builds longest-first prefix candidates', () => {
    const candidates = buildPrefixCandidates('SW1A');
    assert.deepEqual(candidates, ['SW1A', 'SW1', 'SW', 'S']);
  });
});
