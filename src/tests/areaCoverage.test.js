process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://offline:offline@127.0.0.1:1/offline';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-min-32-chars-long';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { COVERAGE_GROUPS, PRICING_ZONES, zonePostcodes } = require('../constants/areaCoverage');
const { LONDON_ZONES } = require('../constants/londonZones');
const { normalizePostcode, buildPrefixCandidates } = require('../services/pricing/regionResolver');

// Same longest-prefix rule as services/pricing/regionResolver.js, against the in-memory zone lists.
const zoneKeyFor = (postcode) => {
  const { outward } = normalizePostcode(postcode);
  const byPrefix = new Map();
  for (const zone of LONDON_ZONES) zone.prefixes.forEach((p) => byPrefix.set(p, zone.key));
  for (const candidate of buildPrefixCandidates(outward)) {
    if (byPrefix.has(candidate)) return byPrefix.get(candidate);
  }
  return null;
};

const setOf = (areas) => new Set(areas.flatMap((a) => a.postcodes));

describe('pricing zones', () => {
  it('has four zones and each postcode sits in exactly one of them', () => {
    assert.deepEqual(Object.keys(PRICING_ZONES), ['zone_1', 'zone_2', 'zone_3', 'zone_4']);
    const seen = new Map();
    for (const [zone, areas] of Object.entries(PRICING_ZONES)) {
      for (const area of areas) {
        for (const code of area.postcodes) {
          assert.ok(!seen.has(code), `${code} is in ${seen.get(code)} and ${zone}`);
          seen.set(code, zone);
        }
      }
    }
  });

  it('LONDON_ZONES takes its postcodes from the zone lists', () => {
    for (const zone of LONDON_ZONES) {
      assert.deepEqual(zone.prefixes, zonePostcodes(zone.key));
      assert.ok(zone.prefixes.length > 0);
    }
  });
});

describe('area coverage page data', () => {
  const group = (key) => COVERAGE_GROUPS.find((g) => g.key === key);

  it('Inner London has 12 boroughs plus the City of London, Outer London 20, M25 three areas', () => {
    assert.equal(group('inner-london').areas.length, 13);
    assert.equal(group('inner-london').areas[0].name, 'City of London');
    assert.equal(group('outer-london').areas.length, 20);
    assert.deepEqual(group('m25-areas').areas.map((a) => a.name), ['Hertfordshire & Buckinghamshire', 'Kent & Essex', 'Surrey']);
  });

  it('each coverage postcode sits in one area only', () => {
    const seen = new Set();
    for (const g of COVERAGE_GROUPS) {
      for (const area of g.areas) {
        for (const code of area.postcodes) {
          assert.ok(!seen.has(code), `${code} is listed twice (${area.name})`);
          seen.add(code);
        }
      }
    }
  });

  it('the coverage page and the pricing zones list the same postcodes', () => {
    const innerPricing = new Set([...setOf(PRICING_ZONES.zone_1), ...setOf(PRICING_ZONES.zone_2)]);
    assert.deepEqual([...setOf(group('inner-london').areas)].sort(), [...innerPricing].sort());
    assert.deepEqual([...setOf(group('outer-london').areas)].sort(), [...setOf(PRICING_ZONES.zone_3)].sort());
    assert.deepEqual([...setOf(group('m25-areas').areas)].sort(), [...setOf(PRICING_ZONES.zone_4)].sort());
  });

  it('every area card on the Area Coverage page matches the data (run scripts/generate-area-coverage.js if not)', () => {
    const page = fs.readFileSync(path.join(__dirname, '../../public/home/area-coverage/index.html'), 'utf8');
    const cards = [...page.matchAll(/<article class="area-card"[^>]*>([\s\S]*?)<\/article>/g)];
    const expected = COVERAGE_GROUPS.flatMap((g) => g.areas);
    assert.equal(cards.length, expected.length);
    cards.forEach((card, i) => {
      const codes = [...card[1].matchAll(/<li(?: hidden)?>([A-Z0-9]+)<\/li>/g)].map((m) => m[1]);
      assert.deepEqual(codes, expected[i].postcodes, `card ${expected[i].name}`);
    });
  });
});

describe('postcode to zone', () => {
  const cases = {
    'SW1A 1AA': 'zone_1',
    'W1K 3AB': 'zone_1',
    'EC1A 1BB': 'zone_1',
    'EC2A 4AA': 'zone_1',
    'WC1X 8JA': 'zone_1',
    'WC2N 5DU': 'zone_1',
    'SE1 9SG': 'zone_2',
    'N1 9GU': 'zone_2',
    'N1C 4AA': 'zone_2',
    'SW3 4RG': 'zone_2',
    'SW7 2AZ': 'zone_2',
    'W8 5SA': 'zone_2',
    'W11 2BQ': 'zone_2',
    'E1W 1AA': 'zone_2',
    'NW8 7JA': 'zone_2',
    'HA4 0AA': 'zone_3',
    'SW19 1AA': 'zone_3',
    'W4 1AA': 'zone_3',
    'KT12 1AA': 'zone_4',
    'DA1 1AA': 'zone_4',
    'BR8 7AA': 'zone_4',
    'IG10 1AA': 'zone_4',
    'WD3 1AA': 'zone_4',
    // not covered
    'UB9 1AA': null,
    'KT11 1AA': null,
    'EN6 1AA': null,
    'M1 1AE': null,
  };
  for (const [postcode, zone] of Object.entries(cases)) {
    it(`${postcode} -> ${zone ?? 'outside coverage'}`, () => {
      assert.equal(zoneKeyFor(postcode), zone);
    });
  }
});
