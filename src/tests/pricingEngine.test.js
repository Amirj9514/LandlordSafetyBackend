require('dotenv').config();
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateRuleConfig, validateRuleScope } = require('../services/pricing/ruleTypes');
const {
  evaluateResidentialLinesFromRules,
  evaluateBookingSurcharges,
  formatDisplayLabel,
} = require('../services/pricing/pricingEngine');
const { RULE_TYPES, RULE_SCOPES } = require('../constants/pricingRuleTypes');

describe('ruleTypes validation', () => {
  it('accepts valid option_tier_lookup config', () => {
    assert.equal(validateRuleConfig('option_tier_lookup', { fieldKey: 'bedrooms' }), null);
  });

  it('rejects bundle_discount without tier key', () => {
    assert.ok(validateRuleConfig('bundle_discount', {}));
  });

  it('validates bundle_discount scope', () => {
    assert.equal(
      validateRuleScope('service_line', 'bundle_discount'),
      'bundle_discount rules must use scope bundle_discount'
    );
  });
});

describe('pricingEngine unit', () => {
  const priceMap = {
    gsc_meter_2: { amount: 74.99, pricingTierId: 't1', isTbcByDefault: false },
    congestion_charge: { amount: 18, pricingTierId: 't2', isTbcByDefault: false },
    parking_charge: { amount: 5, pricingTierId: 't3', isTbcByDefault: false },
  };

  it('formats display labels', () => {
    assert.equal(formatDisplayLabel('Test', 10, false), 'Test — £10.00');
    assert.equal(formatDisplayLabel('Test', null, true), 'Test — TBC');
  });

  it('evaluates tier template rule for GSC', () => {
    const rules = [
      {
        id: 'r1',
        serviceId: 'svc-gsc',
        isActive: true,
        sortOrder: 1,
        ruleType: RULE_TYPES.TIER_KEY_TEMPLATE,
        scope: RULE_SCOPES.SERVICE_LINE,
        config: {
          fieldKey: 'applianceCount',
          template: 'gsc_meter_{value}',
          minValue: 1,
          maxValue: 5,
          subTemplate: 'Meter & {value} appliances',
        },
      },
    ];

    const context = {
      servicesByCode: {
        gsc: { id: 'svc-gsc', code: 'gsc', name: 'Gas Safety Certificate (CP12)' },
      },
      rules,
      questionsByServiceId: {},
    };

    const lines = evaluateResidentialLinesFromRules(
      [{ code: 'gsc', answers: { applianceCount: '2', coAlarmPresent: 'yes' } }],
      [],
      priceMap,
      false,
      context
    );

    assert.equal(lines.length, 1);
    assert.equal(lines[0].total, 74.99);
    assert.equal(lines[0].serviceCode, 'gsc');
  });

  it('adds booking surcharges from rules', () => {
    const rules = [
      {
        id: 's1',
        isActive: true,
        sortOrder: 1,
        ruleType: RULE_TYPES.BOOKING_SURCHARGE,
        scope: RULE_SCOPES.BOOKING_SURCHARGE,
        config: {
          tierKey: 'congestion_charge',
          lineName: 'Congestion Charge',
          sub: 'London Congestion Zone',
          applyWhen: { field: 'congestionZone', equals: true },
        },
      },
    ];

    const lines = evaluateBookingSurcharges(
      rules,
      { congestionZone: true, parkingAvailable: true },
      priceMap,
      false
    );
    assert.equal(lines.length, 1);
    assert.equal(lines[0].total, 18);
  });

  it('evaluates EICR multi_field_sum as separate component lines', () => {
    const eicrPriceMap = {
      eicr_bed_1_3: { amount: 110, pricingTierId: 't-eicr-13', isTbcByDefault: false },
      eicr_board_2: { amount: 60, pricingTierId: 't-eicr-b2', isTbcByDefault: false },
    };

    const rules = [
      {
        id: 'r-eicr',
        serviceId: 'svc-eicr',
        isActive: true,
        sortOrder: 1,
        ruleType: RULE_TYPES.MULTI_FIELD_SUM,
        scope: RULE_SCOPES.SERVICE_LINE,
        config: {
          components: [
            {
              fieldKey: 'bedrooms',
              subTemplate: '{label}',
              tierKeyMap: { '1-3': 'eicr_bed_1_3' },
            },
            {
              fieldKey: 'fuseBoards',
              skipWhenValue: '1',
              subTemplate: '{label}',
              tierKeyTemplate: 'eicr_board_{value}',
              amountMode: 'additive',
            },
          ],
        },
      },
    ];

    const context = {
      servicesByCode: {
        eicr: { id: 'svc-eicr', code: 'eicr', name: 'Electrical Installation Condition Report (EICR)' },
      },
      rules,
      questionsByServiceId: {
        'svc-eicr': [
          {
            fieldKey: 'bedrooms',
            options: [{ value: '1-3', label: '1-3 bedrooms' }],
          },
          {
            fieldKey: 'fuseBoards',
            options: [{ value: '2', label: '2 fuse boards' }],
          },
        ],
      },
    };

    const lines = evaluateResidentialLinesFromRules(
      [{ code: 'eicr', answers: { bedrooms: '1-3', fuseBoards: '2' } }],
      [],
      eicrPriceMap,
      false,
      context
    );

    assert.equal(lines.length, 2);
    assert.equal(lines[0].sub, '1-3 bedrooms');
    assert.equal(lines[0].total, 110);
    assert.equal(lines[1].sub, '2 fuse boards');
    assert.equal(lines[1].total, 60);
    assert.equal(lines[0].serviceCode, 'eicr');
    assert.equal(lines[0].componentFieldKey, 'bedrooms');
    assert.equal(lines[1].serviceCode, 'eicr');
    assert.equal(lines[1].componentFieldKey, 'fuseBoards');
  });
});
