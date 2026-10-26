/**
 * Offline check of the residential price list ("LLSI Residential Book Now: Questions and Pricing", 23 Oct 2026).
 * Runs the real pricing engine against the zone price matrix and the seeded pricing rules, with the database
 * models stubbed out, so it needs no DATABASE_URL.
 */
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://offline:offline@127.0.0.1:1/offline';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-min-32-chars-long';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const src = path.join(__dirname, '..');
const captured = [];

// Stub the models module so the seed script can run without a database.
const modelsPath = require.resolve(path.join(src, 'models'));
require.cache[modelsPath] = {
  id: modelsPath,
  filename: modelsPath,
  loaded: true,
  exports: {
    Service: {
      findOne: async ({ where }) => ({ id: where.code, code: where.code }),
      findAll: async () => [],
    },
    PricingRule: {
      findOrCreate: async () => [{ update: async (payload) => { captured.push({ ...payload }); } }],
      destroy: async () => 0,
      findAll: async () => captured.map((r) => ({ ...r, isActive: true, serviceId: r.serviceId ?? null })),
    },
    syncModels: async () => {},
    ServiceQuestion: {},
  },
};

const engine = require(path.join(src, 'services/pricing/pricingEngine.js'));
const { enrichCatalogWithPrices } = require(path.join(src, 'services/catalogOptionPricing.js'));
const { validateRuleConfig, validateRuleScope } = require(path.join(src, 'services/pricing/ruleTypes.js'));
const catalog = require(path.join(src, 'scripts/seed/catalogData.js'));
const { ZONE_PRICES } = require(path.join(src, 'scripts/seed/zonePrices.js'));

const ZONES = ['zone_1', 'zone_2', 'zone_3', 'zone_4'];
let ctx;
let rules;

before(async () => {
  const realExit = process.exit;
  process.exit = () => {};
  try {
    require(path.join(src, 'scripts/seedPricingRules.js'));
    // The seed script is async; wait until it has finished writing rules.
    let last = -1;
    for (let i = 0; i < 50 && last !== captured.length; i += 1) {
      last = captured.length;
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  } finally {
    process.exit = realExit;
  }

  rules = captured.map((r) => ({ ...r, isActive: true, serviceId: r.serviceId ?? null }));
  const services = catalog.services.filter((s) => s.propertyType === 'residential');
  ctx = {
    servicesByCode: Object.fromEntries(
      services.map((s) => [s.code, { id: s.code, code: s.code, name: s.name, metadata: s.metadata || {} }])
    ),
    rules,
    questionsByServiceId: Object.fromEntries(services.map((s) => [s.code, s.questions || []])),
  };
});

const priceMapFor = (zone) =>
  Object.fromEntries(
    Object.entries(ZONE_PRICES[zone]).map(([k, v]) => [k, { amount: v, pricingTierId: k, isTbcByDefault: false }])
  );

const quote = (zone, selections, bundles = []) => {
  const lines = engine.evaluateResidentialLinesFromRules(selections, bundles, priceMapFor(zone), false, ctx);
  if (lines.some((l) => l.isTbc || l.quoteOnly)) return 'TBC';
  return Math.round(lines.reduce((sum, l) => sum + (l.total || 0), 0) * 100) / 100;
};

const allZones = (selections, bundles) => ZONES.map((z) => quote(z, selections, bundles));

const gsc = (n, extra = {}) => ({ code: 'gsc', answers: { applianceCount: String(n), coAlarmPresent: 'yes', ...extra } });
const boiler = (type) => ({ code: 'boiler', answers: { boilerType: type } });

describe('residential price list: starting prices', () => {
  const START = {
    gsc: [gsc(1), 54.99],
    boiler: [boiler('essential'), 79.99],
    eicr: [{ code: 'eicr', answers: { bedrooms: 'studio', fuseBoards: '1' } }, 89.99],
    pat: [{ code: 'pat', answers: { applianceCount: '10' } }, 54.99],
    fsc: [{ code: 'fsc', answers: { propertySubtype: 'standard', alarmCount: '3' } }, 69.99],
    elc: [{ code: 'elc', answers: { lightCount: '3' } }, 69.99],
    fra: [{ code: 'fra', answers: { propertySubtype: 'house_hmo', bedrooms: '3' } }, 159.99],
    epc: [{ code: 'epc', answers: { bedrooms: 'studio' } }, 69.99],
    floorplan: [{ code: 'floorplan', answers: { bedrooms: '0', floors: '1' } }, 99.99],
    asbestos: [
      { code: 'asbestos', answers: { propertyType: 'flat', surveyType: 'management', configuration: '2_sample' } },
      349.99,
    ],
    callout: [{ code: 'callout', answers: { faultType: 'gas', issueDescription: 'x' } }, 119.99],
  };

  for (const [code, [selection, expected]] of Object.entries(START)) {
    it(`${code} starts from £${expected} and the card metadata agrees`, () => {
      const lowest = Math.min(...ZONES.map((z) => quote(z, [selection])));
      assert.equal(lowest, expected);
      assert.equal(ctx.servicesByCode[code].metadata.startingFrom, expected);
    });
  }
});

describe('residential price list: zone prices', () => {
  it('CP12: meter + 1 appliance, +£10 per extra appliance, CO alarm £40 in Zone 1 else £35', () => {
    assert.deepEqual(allZones([gsc(1)]), [64.99, 54.99, 59.99, 64.99]);
    assert.deepEqual(allZones([gsc(3)]), [84.99, 74.99, 79.99, 84.99]);
    assert.deepEqual(allZones([gsc(8)]), [134.99, 124.99, 129.99, 134.99]);
    assert.deepEqual(
      allZones([gsc(1, { coAlarmPresent: 'no', coAlarmInstall: 'yes' })]),
      [104.99, 89.99, 94.99, 99.99]
    );
  });

  it('boiler service levels', () => {
    assert.deepEqual(allZones([boiler('essential')]), [89.99, 79.99, 84.99, 89.99]);
    assert.deepEqual(allZones([boiler('standard')]), [149.99, 139.99, 139.99, 149.99]);
    assert.deepEqual(allZones([boiler('premium')]), [249.99, 239.99, 239.99, 249.99]);
  });

  it('CP12 + boiler bundles: Essential fixed price, Standard / Premium 5% off', () => {
    const bundle = ['bundle-gsc-boiler'];
    assert.deepEqual(allZones([gsc(1), boiler('essential')], bundle), [119.99, 109.99, 109.99, 119.99]);
    assert.deepEqual(allZones([gsc(2), boiler('essential')], bundle), [119.99, 109.99, 109.99, 119.99]);
    assert.deepEqual(allZones([gsc(3), boiler('essential')], bundle), [129.99, 119.99, 119.99, 129.99]);
    assert.equal(quote('zone_2', [gsc(1), boiler('standard')], bundle), 185.23);
    assert.equal(quote('zone_2', [gsc(1), boiler('premium')], bundle), 280.23);
    assert.equal(quote('zone_2', [gsc(1), boiler('standard')], []), 194.98);
  });

  it('EICR', () => {
    assert.deepEqual(allZones([{ code: 'eicr', answers: { bedrooms: 'studio', fuseBoards: '1' } }]), [99.99, 89.99, 89.99, 99.99]);
    assert.deepEqual(allZones([{ code: 'eicr', answers: { bedrooms: '1-3', fuseBoards: '1' } }]), [119.99, 104.99, 109.99, 119.99]);
    assert.deepEqual(allZones([{ code: 'eicr', answers: { bedrooms: '4', fuseBoards: '1' } }]), [139.99, 124.99, 129.99, 139.99]);
    assert.deepEqual(allZones([{ code: 'eicr', answers: { bedrooms: '1-3', fuseBoards: '2' } }]), [179.99, 164.99, 169.99, 179.99]);
  });

  it('PAT bands and the £2.50 charge above 20 appliances', () => {
    const pat = (n) => [{ code: 'pat', answers: { applianceCount: String(n) } }];
    assert.deepEqual(allZones(pat(10)), [59.99, 54.99, 57.99, 59.99]);
    assert.deepEqual(allZones(pat(15)), [79.99, 64.99, 67.99, 69.99]);
    assert.deepEqual(allZones(pat(20)), [99.99, 79.99, 79.99, 89.99]);
    assert.deepEqual(allZones(pat(24)), [109.99, 89.99, 89.99, 99.99]);
  });

  it('FSC Grade D / Grade A', () => {
    const fsc = (sub, n) => [{ code: 'fsc', answers: { propertySubtype: sub, alarmCount: String(n) } }];
    assert.deepEqual(allZones(fsc('standard', 3)), [79.99, 69.99, 74.99, 74.99]);
    assert.deepEqual(allZones(fsc('premium', 3)), [139.99, 119.99, 124.99, 129.99]);
    assert.deepEqual(allZones(fsc('standard', 6)), [139.99, 114.99, 119.99, 119.99]);
  });

  it('ELC', () => {
    const elc = (n) => [{ code: 'elc', answers: { lightCount: String(n) } }];
    assert.deepEqual(allZones(elc(3)), [79.99, 69.99, 74.99, 74.99]);
    assert.deepEqual(allZones(elc(5)), [119.99, 99.99, 104.99, 114.99]);
  });

  it('FRA: house / HMO by bedrooms, building by floors / communal areas', () => {
    const house = (b) => [{ code: 'fra', answers: { propertySubtype: 'house_hmo', bedrooms: String(b) } }];
    const building = (n) => [{ code: 'fra', answers: { propertySubtype: 'building', communalAreas: String(n) } }];
    assert.deepEqual(allZones(house(3)), [179.99, 159.99, 164.99, 169.99]);
    assert.deepEqual(allZones(house(5)), [239.99, 199.99, 204.99, 219.99]);
    assert.deepEqual(allZones(building(1)), [179.99, 159.99, 164.99, 169.99]);
    assert.deepEqual(allZones(building(3)), [279.97, 239.97, 244.97, 259.97]);
  });

  it('EPC', () => {
    const epc = (b) => [{ code: 'epc', answers: { bedrooms: b } }];
    assert.deepEqual(allZones(epc('studio')), [89.99, 69.99, 84.99, 84.99]);
    assert.deepEqual(allZones(epc('1-3')), [109.99, 99.99, 104.99, 109.99]);
    assert.deepEqual(allZones(epc('4')), [129.99, 119.99, 124.99, 129.99]);
  });

  it('Floor plan', () => {
    const fp = (b, f = 1) => [{ code: 'floorplan', answers: { bedrooms: String(b), floors: String(f) } }];
    assert.deepEqual(allZones(fp(0)), [109.99, 99.99, 104.99, 109.99]);
    assert.deepEqual(allZones(fp(2)), [119.99, 109.99, 114.99, 119.99]);
    assert.deepEqual(allZones(fp(3)), [139.99, 129.99, 134.99, 139.99]);
    assert.deepEqual(allZones(fp(2, 2)), [159.98, 149.98, 154.98, 159.98]);
  });

  it('Asbestos: limited, full up to 5 bed, quote only above', () => {
    const asb = (c) => [{ code: 'asbestos', answers: { propertyType: 'house_building', surveyType: 'management', configuration: c } }];
    assert.deepEqual(allZones(asb('2_sample')), [399.99, 349.99, 379.99, 399.99]);
    assert.deepEqual(allZones(asb('full_property')), [599.99, 599.99, 599.99, 599.99]);
    assert.deepEqual(allZones(asb('full_property_over_5')), ['TBC', 'TBC', 'TBC', 'TBC']);
  });

  it('Non-emergency callout is £119.99 for every fault type', () => {
    for (const faultType of ['gas', 'electrical', 'fire_alarm']) {
      assert.deepEqual(
        allZones([{ code: 'callout', answers: { faultType, issueDescription: 'x' } }]),
        [119.99, 119.99, 119.99, 119.99]
      );
    }
  });

  it('Priority Service is a £99 booking-level surcharge only when requested', () => {
    const lines = (flags) =>
      engine.evaluateBookingSurcharges(rules, flags, priceMapFor('zone_2'), false).map((l) => [l.name, l.total]);
    assert.deepEqual(lines({ priorityService: true }), [['Priority Service', 99]]);
    assert.deepEqual(lines({ priorityService: false }), []);
  });
});

describe('catalog output for the booking form', () => {
  it('boiler options carry the CP12 bundle prices and CP12 questions carry info + stepper', async () => {
    const mk = (code) => ({
      ...ctx.servicesByCode[code],
      questions: ctx.questionsByServiceId[code].map((q, i) => ({ ...q, id: `${code}${i}` })),
      children: [],
    });
    const shape = { categories: [{ code: 'x', services: [mk('boiler'), mk('gsc')] }] };
    const out = await enrichCatalogWithPrices(shape, priceMapFor('zone_2'), { id: 'z2', name: 'Zone 2' }, 'SE1 9SG');
    const [boilerSvc, gscSvc] = out.categories[0].services;

    assert.deepEqual(
      boilerSvc.questions[0].options.map((o) => o.displayLabelBundle),
      ['CP12 + Essential Service — £109.99', 'CP12 + Standard Service — £185.23', 'CP12 + Premium Service — £280.23']
    );
    const appliance = gscSvc.questions.find((q) => q.fieldKey === 'applianceCount');
    assert.equal(appliance.validation.stepper, true);
    assert.match(appliance.conditionalLogic.info, /boilers, hobs\/cookers and fires/);
    const co = gscSvc.questions.find((q) => q.fieldKey === 'coAlarmInstall');
    assert.equal(co.options[0].displayLabel, 'Fit a CO alarm — £35.00');
  });
});

describe('admin portal: seeded pricing rules', () => {
  it('every seeded rule passes the validation the admin API applies when rules are edited', () => {
    assert.ok(rules.length > 10);
    for (const rule of rules) {
      assert.equal(
        validateRuleConfig(rule.ruleType, rule.config) || validateRuleScope(rule.scope, rule.ruleType),
        null,
        `rule ${rule.ruleKey} should be valid`
      );
    }
  });
});
