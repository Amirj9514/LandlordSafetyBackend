require('dotenv').config();
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret-key-min-32-chars-long';

const { sequelize } = require('../models');
const { calculateQuote, quoteRequiresQuotation, quoteHasUnpricedLines } = require('../services/pricing/quoteCalculator');

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

  it('prices GSC meter & 2 appliances at £64.99 in Zone 2', async (t) => {
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
    assert.equal(gsc.total, 64.99);
    assert.equal(quote.pricingStatus, 'priced');
  });

  it('CP12 with the Essential boiler add-on applies the bundle price in Zone 2', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [
        { code: 'gsc', answers: { applianceCount: '1', coAlarmPresent: 'yes', boilerAddon: 'essential' } },
      ],
      activeBundleKeys: [],
    });
    const boiler = quote.lines.find((l) => l.name === 'Boiler Service');
    assert.equal(boiler.total, 79.99);
    const disc = quote.lines.find((l) => l.isDiscount && l.name.includes('CP12 + Boiler'));
    assert.ok(disc);
    assert.equal(disc.total, -24.99);
    const gsc = quote.lines.find((l) => l.name.includes('Gas Safety'));
    assert.equal(gsc.total, 54.99);
    // Fixed CP12 + Essential bundle price: 2 appliances included
    assert.equal(quote.total, 109.99);
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
    assert.equal(pat.total, 54.99);
  });

  it('EICR + PAT bundle applies £54.99 PAT and £10 discount', async (t) => {
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
    assert.equal(pat.total, 54.99);
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
    assert.equal(quote.total, 77.99);
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
    assert.equal(quote.total, 87.99);
  });

  it('PAT above 20 appliances adds £2.50 per extra appliance in Zone 2', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [{ code: 'pat', answers: { applianceCount: '24' } }],
      activeBundleKeys: [],
    });
    const pat = quote.lines.find((l) => l.serviceCode === 'pat');
    assert.equal(pat.total, 89.99);
    assert.equal(quote.pricingStatus, 'priced');
  });

  it('Floor plan studio is priced in Zone 2', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [{ code: 'floorplan', answers: { bedrooms: '0', floors: '1' } }],
      activeBundleKeys: [],
    });
    const fp = quote.lines.find((l) => l.serviceCode === 'floorplan');
    assert.equal(fp.total, 99.99);
  });

  it('CP12 + Standard add-on takes 5% off in Zone 2', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [
        { code: 'gsc', answers: { applianceCount: '1', coAlarmPresent: 'yes', boilerAddon: 'standard' } },
      ],
      activeBundleKeys: [],
    });
    assert.equal(quote.total, 185.23);
  });

  it('CP12 + Premium add-on takes 5% off in Zone 2', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [
        { code: 'gsc', answers: { applianceCount: '1', coAlarmPresent: 'yes', boilerAddon: 'premium' } },
      ],
      activeBundleKeys: [],
    });
    assert.equal(quote.total, 280.23);
  });

  it('CP12 and a separately selected Standard boiler service have no bundle discount', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [
        { code: 'gsc', answers: { applianceCount: '1', coAlarmPresent: 'yes' } },
        { code: 'boiler', answers: { boilerType: 'standard' } },
      ],
      activeBundleKeys: [],
    });
    assert.ok(!quote.lines.some((l) => l.isDiscount));
    assert.equal(quote.total, 194.98);
  });

  it('CP12 charges £10 for each appliance beyond the first', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [{ code: 'gsc', answers: { applianceCount: '8', coAlarmPresent: 'yes' } }],
      activeBundleKeys: [],
    });
    assert.equal(quote.total, 124.99);
  });

  it('CO alarm is £40 in Zone 1 and £35 in Zone 2', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const answers = { applianceCount: '1', coAlarmPresent: 'no', coAlarmInstall: 'yes' };
    const z2 = await calculateQuote({ propertyType: 'residential', postcode: zone2Postcode, services: [{ code: 'gsc', answers }], activeBundleKeys: [] });
    const z1 = await calculateQuote({ propertyType: 'residential', postcode: zone1Postcode, services: [{ code: 'gsc', answers }], activeBundleKeys: [] });
    assert.equal(z2.lines.find((l) => l.name === 'CO Alarm Installation').total, 35);
    assert.equal(z1.lines.find((l) => l.name === 'CO Alarm Installation').total, 40);
  });

  it('FRA prices a house by bedrooms and a building by floors / communal areas', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const house = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [{ code: 'fra', answers: { propertySubtype: 'house_hmo', bedrooms: '5' } }],
      activeBundleKeys: [],
    });
    const building = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [{ code: 'fra', answers: { propertySubtype: 'building', communalAreas: '3' } }],
      activeBundleKeys: [],
    });
    assert.equal(house.total, 199.99);
    assert.equal(building.total, 239.97);
  });

  it('Asbestos full survey over 5 bed is quote only', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [
        { code: 'asbestos', answers: { propertyType: 'house_building', surveyType: 'management', configuration: 'full_property_over_5' } },
      ],
      activeBundleKeys: [],
    });
    assert.equal(quoteHasUnpricedLines(quote.lines), true);
  });

  it('Non-emergency callout is £150 per fault type', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const quote = await calculateQuote({
      propertyType: 'residential',
      postcode: zone2Postcode,
      services: [{ code: 'callout', answers: { faultType: 'gas', issueDescription: 'Boiler not firing' } }],
      activeBundleKeys: [],
    });
    assert.equal(quote.total, 150);
  });

  it('Priority Service adds £99 only when requested', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const base = { propertyType: 'residential', postcode: zone2Postcode, activeBundleKeys: [], services: [{ code: 'gsc', answers: { applianceCount: '1', coAlarmPresent: 'yes' } }] };
    const without = await calculateQuote({ ...base });
    const withPriority = await calculateQuote({ ...base, priorityService: true });
    assert.ok(!without.lines.some((l) => l.name === 'Priority Service'));
    assert.equal(withPriority.lines.find((l) => l.name === 'Priority Service').total, 99);
    assert.equal(withPriority.total, 153.99);
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
