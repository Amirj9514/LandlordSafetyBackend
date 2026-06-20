require('dotenv').config();
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret-key-min-32-chars-long';

const { sequelize } = require('../models');
const { calculateQuote, quoteRequiresQuotation } = require('../services/pricing/quoteCalculator');

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
  const zone2Postcode = 'SE1 9SG';
  const zone1Postcode = 'W1A 1AA';

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

  it('prices GSC meter & 2 appliances at £62.99 in Zone 2', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [
        { code: 'gsc', answers: { applianceCount: '2', coAlarmPresent: 'yes' } },
      ],
      activeBundleKeys: [],
    });
    assert.ok(quote.resolvedRegion);
    const gsc = quote.lines.find((l) => l.name.includes('Gas Safety'));
    assert.ok(gsc);
    assert.equal(gsc.total, 62.99);
    assert.equal(quote.pricingStatus, 'priced');
  });

  it('GSC + basic boiler bundle applies bundle discount in Zone 2', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [
        { code: 'gsc', answers: { applianceCount: '1', coAlarmPresent: 'yes' } },
        { code: 'boiler', answers: { boilerType: 'basic' } },
      ],
      activeBundleKeys: ['bundle-gsc-boiler'],
    });
    const boiler = quote.lines.find((l) => l.name === 'Boiler Service');
    assert.equal(boiler.total, 60);
    const disc = quote.lines.find((l) => l.isDiscount && l.name.includes('GSC + Boiler'));
    assert.ok(disc);
    assert.equal(disc.total, -33);
    const gsc = quote.lines.find((l) => l.name.includes('Gas Safety'));
    assert.equal(gsc.total, 52.99);
    assert.equal(quote.total, 79.99);
  });

  it('EICR with extra fuse boards returns separate priced lines', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [{ code: 'eicr', answers: { bedrooms: '1-3', fuseBoards: '2' } }],
      activeBundleKeys: [],
    });
    const eicrLines = quote.lines.filter((l) => l.serviceCode === 'eicr' && !l.isDiscount);
    assert.equal(eicrLines.length, 2);
    assert.ok(eicrLines.some((l) => l.sub === '1-3 bedrooms' && l.total === 104.99));
    assert.ok(eicrLines.some((l) => l.sub.includes('2 fuse boards') && l.total === 60));
    assert.equal(quote.subtotal, 164.99);
  });

  it('EICR + PAT without bundle row does not apply bundle discount', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [
        { code: 'eicr', answers: { bedrooms: '1-3', fuseBoards: '1' } },
        { code: 'pat', answers: { applianceCount: '8' } },
      ],
      activeBundleKeys: [],
    });
    assert.ok(!quote.lines.some((l) => l.isDiscount));
    const pat = quote.lines.find((l) => l.serviceCode === 'pat' && !l.isDiscount);
    assert.ok(pat);
    assert.equal(pat.total, 49.99);
  });

  it('EICR + PAT bundle applies £49.99 PAT and £10 discount', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [
        { code: 'eicr', answers: { bedrooms: '1-3', fuseBoards: '1' } },
        { code: 'pat', answers: { applianceCount: '8' } },
      ],
      activeBundleKeys: ['bundle-eicr-pat'],
    });
    const pat = quote.lines.find((l) => l.serviceCode === 'pat' && !l.isDiscount);
    assert.ok(pat);
    assert.equal(pat.total, 49.99);
    const disc = quote.lines.find((l) => l.isDiscount);
    assert.equal(disc.total, -10);
  });

  it('adds congestion and parking charges in Zone 2', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [
        { code: 'gsc', answers: { applianceCount: '1', coAlarmPresent: 'yes' } },
      ],
      activeBundleKeys: [],
      congestionZone: true,
      parkingAvailable: false,
    });
    assert.equal(quote.total, 75.99);
  });

  it('Zone 1 auto-applies congestion and parking charges', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: zone1Postcode,
      services: [
        { code: 'gsc', answers: { applianceCount: '1', coAlarmPresent: 'yes' } },
      ],
      activeBundleKeys: [],
    });
    assert.match(quote.resolvedRegion.name, /Zone 1/);
    assert.ok(!quote.lines.some((l) => l.name === 'Zone Premium'));
    assert.ok(quote.lines.some((l) => l.name === 'Congestion Charge' && l.total === 18));
    assert.ok(quote.lines.some((l) => l.name === 'Parking Charge' && l.total === 5));
    assert.equal(quote.total, 82.99);
  });

  it('GSC line includes serviceCode and serviceName', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [
        { code: 'gsc', answers: { applianceCount: '1', coAlarmPresent: 'yes' } },
      ],
      activeBundleKeys: [],
    });
    const gsc = quote.lines.find((l) => l.serviceCode === 'gsc' && !l.isDiscount);
    assert.ok(gsc);
    assert.equal(gsc.serviceName, 'Gas Safety Certificate (CP12)');
  });

  it('quoteRequiresQuotation when any priced line is TBC', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: 'ZZ99 9ZZ',
      services: [
        { code: 'gsc', answers: { applianceCount: '1', coAlarmPresent: 'yes' } },
      ],
      activeBundleKeys: [],
    });
    assert.equal(quoteRequiresQuotation(quote.lines), true);
    const priced = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [
        { code: 'gsc', answers: { applianceCount: '1', coAlarmPresent: 'yes' } },
      ],
      activeBundleKeys: [],
    });
    assert.equal(quoteRequiresQuotation(priced.lines), false);
  });
});
