require('dotenv').config();
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret-key-min-32-chars-long';

const { sequelize } = require('../models');
const { calculateQuote } = require('../services/pricing/quoteCalculator');

let dbAvailable = false;

before(async () => {
  try {
    await sequelize.authenticate();
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
});

describe('quoteCalculator', () => {
  it('returns all TBC when postcode has no region', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: 'ZZ99 9ZZ',
      services: [
        { code: 'gsc', answers: { applianceCount: '1', coAlarmPresent: 'yes' } },
      ],
      activeBundleKeys: [],
    });
    assert.equal(quote.resolvedRegion, null);
    assert.equal(quote.pricingStatus, 'all_tbc');
    assert.ok(quote.lines.every((l) => l.isTbc));
  });

  it('prices GSC meter & 2 appliances at £74.99 in covered region', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: 'SW1A 1AA',
      services: [
        { code: 'gsc', answers: { applianceCount: '2', coAlarmPresent: 'yes' } },
      ],
      activeBundleKeys: [],
    });
    assert.ok(quote.resolvedRegion);
    const gsc = quote.lines.find((l) => l.name.includes('Gas Safety'));
    assert.ok(gsc);
    assert.equal(gsc.total, 74.99);
    assert.equal(quote.pricingStatus, 'priced');
  });

  it('GSC + full boiler bundle uses £120 add-on (not standalone £150)', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: 'SW1A 1AA',
      services: [
        { code: 'gsc', answers: { applianceCount: '1', coAlarmPresent: 'yes' } },
        { code: 'boiler', answers: { boilerType: 'full' } },
      ],
      activeBundleKeys: ['bundle-gsc-boiler'],
    });
    const boiler = quote.lines.find((l) => l.name === 'Boiler Service');
    assert.equal(boiler.total, 150);
    const disc = quote.lines.find((l) => l.isDiscount && l.name.includes('GSC + Boiler'));
    assert.ok(disc);
    assert.equal(disc.total, -30);
    const gsc = quote.lines.find((l) => l.name.includes('Gas Safety'));
    assert.equal(gsc.total, 59.99);
    assert.equal(quote.total, 179.99);
  });

  it('EICR + PAT without bundle row does not apply bundle discount', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: 'SW1A 1AA',
      services: [
        { code: 'eicr', answers: { bedrooms: '1-3', fuseBoards: '1' } },
        { code: 'pat', answers: { applianceCount: '8' } },
      ],
      activeBundleKeys: [],
    });
    assert.ok(!quote.lines.some((l) => l.isDiscount));
    const pat = quote.lines.find((l) => l.name === 'PAT Testing');
    assert.equal(pat.total, 59.99);
  });

  it('EICR + PAT bundle applies £49.99 PAT and £10 discount', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: 'SW1A 1AA',
      services: [
        { code: 'eicr', answers: { bedrooms: '1-3', fuseBoards: '1' } },
        { code: 'pat', answers: { applianceCount: '8' } },
      ],
      activeBundleKeys: ['bundle-eicr-pat'],
    });
    const pat = quote.lines.find((l) => l.name === 'PAT Testing');
    assert.equal(pat.total, 49.99);
    const disc = quote.lines.find((l) => l.isDiscount);
    assert.equal(disc.total, -10);
  });

  it('adds congestion and parking charges', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: 'SW1A 1AA',
      services: [
        { code: 'gsc', answers: { applianceCount: '1', coAlarmPresent: 'yes' } },
      ],
      activeBundleKeys: [],
      congestionZone: true,
      parkingAvailable: false,
    });
    assert.equal(quote.total, 82.99);
  });
});
