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

  it('tries the district, then the district without its sub-district letter', () => {
    assert.deepEqual(buildPrefixCandidates('SW1A'), ['SW1A', 'SW1']);
    assert.deepEqual(buildPrefixCandidates('E1W'), ['E1W', 'E1']);
    assert.deepEqual(buildPrefixCandidates('SE1'), ['SE1']);
  });

  it('never shortens a district to a different one (KT11 is not KT1, DA11 is not DA1)', () => {
    assert.deepEqual(buildPrefixCandidates('KT11'), ['KT11']);
    assert.deepEqual(buildPrefixCandidates('DA11'), ['DA11']);
    assert.deepEqual(buildPrefixCandidates(''), []);
  });
});
