require('dotenv').config();
const { Service, PricingRule, syncModels } = require('../models');
const { RULE_TYPES, RULE_SCOPES } = require('../constants/pricingRuleTypes');
const { PRICING_MODES } = require('../constants/propertyTypes');

const upsertRule = async (ruleKey, payload) => {
  const [row] = await PricingRule.findOrCreate({
    where: { ruleKey },
    defaults: { ...payload, ruleKey },
  });
  await row.update({ ...payload, ruleKey });
  return row;
};

const serviceIdByCode = async (code) => {
  const svc = await Service.findOne({ where: { code } });
  if (!svc) throw new Error(`Service not found for pricing rule seed: ${code}`);
  return svc.id;
};

const residentialRules = async () => {
  const ids = {};
  for (const code of [
    'gsc', 'boiler', 'eicr', 'pat', 'fsc', 'elc', 'fra', 'epc', 'floorplan', 'asbestos',
  ]) {
    ids[code] = await serviceIdByCode(code);
  }

  await upsertRule('gsc_appliance_line', {
    ruleType: RULE_TYPES.OPTION_TIER_LOOKUP,
    scope: RULE_SCOPES.SERVICE_LINE,
    serviceId: ids.gsc,
    sortOrder: 1,
    config: {
      fieldKey: 'applianceCount',
      subTemplate: 'Meter & {value} appliance(s)',
    },
  });

  await upsertRule('gsc_co_alarm_addon', {
    ruleType: RULE_TYPES.CONDITIONAL_ADDON,
    scope: RULE_SCOPES.ADDON,
    serviceId: ids.gsc,
    sortOrder: 2,
    config: {
      when: { field: 'coAlarmPresent', equals: 'no', and: { field: 'coAlarmInstall', equals: 'yes' } },
      tierKey: 'co_alarm_install',
      lineName: 'CO Alarm Installation',
      sub: '',
    },
  });

  await upsertRule('boiler_type_line', {
    ruleType: RULE_TYPES.OPTION_TIER_LOOKUP,
    scope: RULE_SCOPES.SERVICE_LINE,
    serviceId: ids.boiler,
    sortOrder: 1,
    config: {
      fieldKey: 'boilerType',
      tierKeyField: 'tierKeyStandalone',
    },
  });

  await upsertRule('eicr_multi_field', {
    ruleType: RULE_TYPES.MULTI_FIELD_SUM,
    scope: RULE_SCOPES.SERVICE_LINE,
    serviceId: ids.eicr,
    sortOrder: 1,
    config: {
      components: [
        {
          fieldKey: 'bedrooms',
          subTemplate: '{label}',
          tierKeyMap: {
            studio: 'eicr_studio',
            '1-3': 'eicr_bed_1_3',
            '4': 'eicr_bed_4',
            '5': 'eicr_bed_5',
            '6': 'eicr_bed_6',
            '7': 'eicr_bed_7',
            '8': 'eicr_bed_8',
          },
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
  });

  await upsertRule('pat_flat_extra', {
    ruleType: RULE_TYPES.FLAT_PLUS_EXTRA_UNITS,
    scope: RULE_SCOPES.SERVICE_LINE,
    serviceId: ids.pat,
    sortOrder: 1,
    config: {
      fieldKey: 'applianceCount',
      flatTierKey: 'pat_flat_1_10',
      extraTierKey: 'pat_per_extra_appliance',
      flatUpTo: 10,
      variantWhen: {
        bundleKey: 'bundle-eicr-pat',
        requiresServiceCode: 'eicr',
        flatTierKey: 'pat_with_eicr_1_10',
      },
      subTemplate: '{count} appliance(s)',
    },
  });

  await upsertRule('fsc_alarm_line', {
    ruleType: RULE_TYPES.BASE_PLUS_INCREMENT,
    scope: RULE_SCOPES.SERVICE_LINE,
    serviceId: ids.fsc,
    sortOrder: 1,
    config: {
      fieldKey: 'alarmCount',
      baseTierKey: 'fsc_standard_base',
      baseTierKeyWhen: [{ field: 'propertySubtype', equals: 'premium', tierKey: 'fsc_premium_base' }],
      includedUnits: 3,
      extraTierKey: 'fsc_alarm_extra',
      subTemplate: '{count} alarm(s)',
    },
  });

  await upsertRule('elc_light_line', {
    ruleType: RULE_TYPES.BASE_PLUS_INCREMENT,
    scope: RULE_SCOPES.SERVICE_LINE,
    serviceId: ids.elc,
    sortOrder: 1,
    config: {
      fieldKey: 'lightCount',
      baseTierKey: 'elc_base',
      includedUnits: 3,
      extraTierKey: 'elc_light_extra',
      subTemplate: '{count} light(s)',
    },
  });

  await upsertRule('fra_line', {
    ruleType: RULE_TYPES.BASE_PLUS_INCREMENT,
    scope: RULE_SCOPES.SERVICE_LINE,
    serviceId: ids.fra,
    sortOrder: 1,
    config: {
      fieldKey: 'bedrooms',
      baseTierKey: 'fra_base',
      includedUnits: 3,
      extraTierKey: 'fra_bed_extra',
      additionalIncrements: [
        { fieldKey: 'communalAreas', includedUnits: 1, extraTierKey: 'fra_communal_extra' },
      ],
      subTemplate: '{bedrooms} beds, {communalAreas} communal area(s)',
    },
  });

  await upsertRule('epc_bedrooms', {
    ruleType: RULE_TYPES.OPTION_TIER_LOOKUP,
    scope: RULE_SCOPES.SERVICE_LINE,
    serviceId: ids.epc,
    sortOrder: 1,
    config: {
      fieldKey: 'bedrooms',
      forceTbcTierKeys: ['epc_bed_7_plus'],
      quoteOnlyWhenForceTbc: true,
    },
  });

  await upsertRule('floorplan_beds_floors', {
    ruleType: RULE_TYPES.TIER_RANGE_MAP,
    scope: RULE_SCOPES.SERVICE_LINE,
    serviceId: ids.floorplan,
    sortOrder: 1,
    config: {
      ranges: [
        { min: 1, max: 2, tierKey: 'fp_bed_1_2' },
        { min: 3, max: 3, tierKey: 'fp_bed_3' },
        { min: 4, max: 4, tierKey: 'fp_bed_4' },
        { min: 5, max: 5, tierKey: 'fp_bed_5' },
        { min: 6, max: 99, tierKey: 'fp_bed_6_plus' },
      ],
      floorExtraTierKey: 'fp_floor_extra',
      includedFloors: 1,
      subTemplate: '{beds} bed(s), {floors} floor(s)',
    },
  });

  await upsertRule('asbestos_house', {
    ruleType: RULE_TYPES.OPTION_TIER_LOOKUP,
    scope: RULE_SCOPES.SERVICE_LINE,
    serviceId: ids.asbestos,
    sortOrder: 1,
    config: {
      fieldKey: 'configuration',
      sub: 'House — up to 3 bedrooms (Full Test)',
    },
  });

  await upsertRule('asbestos_other_tbc', {
    ruleType: RULE_TYPES.FORCE_TBC,
    scope: RULE_SCOPES.SERVICE_LINE,
    serviceId: ids.asbestos,
    sortOrder: 2,
    config: {
      when: { field: 'configuration', notIn: ['house_3bed'] },
      sub: 'Custom configuration — quote required',
    },
  });

  await upsertRule('bundle_gsc_boiler_discount', {
    ruleType: RULE_TYPES.BUNDLE_DISCOUNT,
    scope: RULE_SCOPES.BUNDLE_DISCOUNT,
    serviceId: null,
    sortOrder: 10,
    config: {
      bundleKey: 'bundle-gsc-boiler',
      requiredServiceCodes: ['gsc', 'boiler'],
      discountTierKeyFromField: {
        serviceCode: 'boiler',
        fieldKey: 'boilerType',
        map: { basic: 'bundle_gsc_boiler_basic', full: 'bundle_gsc_boiler_full' },
      },
      lineLabel: 'Bundle Discount — GSC + Boiler Service',
    },
  });

  await upsertRule('bundle_eicr_pat_discount', {
    ruleType: RULE_TYPES.BUNDLE_DISCOUNT,
    scope: RULE_SCOPES.BUNDLE_DISCOUNT,
    serviceId: null,
    sortOrder: 20,
    config: {
      bundleKey: 'bundle-eicr-pat',
      requiredServiceCodes: ['eicr', 'pat'],
      discountTierKey: 'bundle_eicr_pat_total',
      lineLabel: 'Bundle Discount — EICR + PAT',
    },
  });

  await upsertRule('bundle_fsc_elc_fra_discount', {
    ruleType: RULE_TYPES.BUNDLE_DISCOUNT,
    scope: RULE_SCOPES.BUNDLE_DISCOUNT,
    serviceId: null,
    sortOrder: 30,
    config: {
      bundleKey: 'bundle-fsc-elc-fra',
      requiredServiceCodes: ['fsc', 'elc', 'fra'],
      discountTierKey: 'bundle_fsc_elc_fra',
      lineLabel: 'Bundle Discount — FSC + ELC + FRA',
      exclusionGroup: 'fire-bundle',
    },
  });

  await upsertRule('bundle_fsc_elc_discount', {
    ruleType: RULE_TYPES.BUNDLE_DISCOUNT,
    scope: RULE_SCOPES.BUNDLE_DISCOUNT,
    serviceId: null,
    sortOrder: 31,
    config: {
      bundleKey: 'bundle-fsc-elc',
      requiredServiceCodes: ['fsc', 'elc'],
      discountTierKey: 'bundle_fsc_elc',
      lineLabel: 'Bundle Discount — FSC + ELC',
      exclusionGroup: 'fire-bundle',
    },
  });

  await upsertRule('bundle_epc_fp_discount', {
    ruleType: RULE_TYPES.BUNDLE_DISCOUNT,
    scope: RULE_SCOPES.BUNDLE_DISCOUNT,
    serviceId: null,
    sortOrder: 40,
    config: {
      bundleKey: 'bundle-epc-fp',
      requiredServiceCodes: ['epc', 'floorplan'],
      discountTierKey: 'bundle_epc_floorplan',
      lineLabel: 'Bundle Discount — EPC + Floor Plan',
      onlyWhenServiceSelected: 'epc',
    },
  });

  await upsertRule('surcharge_congestion', {
    ruleType: RULE_TYPES.BOOKING_SURCHARGE,
    scope: RULE_SCOPES.BOOKING_SURCHARGE,
    serviceId: null,
    sortOrder: 100,
    config: {
      tierKey: 'congestion_charge',
      lineName: 'Congestion Charge',
      sub: 'London Congestion Zone',
      applyWhen: { field: 'congestionZone', equals: true },
    },
  });

  await upsertRule('surcharge_parking', {
    ruleType: RULE_TYPES.BOOKING_SURCHARGE,
    scope: RULE_SCOPES.BOOKING_SURCHARGE,
    serviceId: null,
    sortOrder: 101,
    config: {
      tierKey: 'parking_charge',
      lineName: 'Parking Charge',
      sub: 'No parking available at property',
      applyWhen: { field: 'parkingAvailable', equals: false },
    },
  });
};

const commercialAndInstallationRules = async () => {
  const services = await Service.findAll({
    where: { pricingMode: [PRICING_MODES.QUOTE_ONLY, PRICING_MODES.STARTS_FROM] },
  });

  for (const svc of services) {
    if (svc.pricingMode === PRICING_MODES.QUOTE_ONLY) {
      await upsertRule(`${svc.code}_quote_only`, {
        ruleType: RULE_TYPES.QUOTE_ONLY,
        scope: RULE_SCOPES.SERVICE_LINE,
        serviceId: svc.id,
        sortOrder: 1,
        config: { sub: 'Quote on request' },
      });
    } else if (svc.pricingMode === PRICING_MODES.STARTS_FROM) {
      await upsertRule(`${svc.code}_starts_from`, {
        ruleType: RULE_TYPES.STARTS_FROM,
        scope: RULE_SCOPES.SERVICE_LINE,
        serviceId: svc.id,
        sortOrder: 1,
        config: {
          tierKey: svc.metadata?.startsFromTierKey || null,
          staticAmount: svc.metadata?.startsFrom ?? null,
        },
      });
    }
  }
};

const run = async () => {
  await syncModels({ alter: true });
  await residentialRules();
  await commercialAndInstallationRules();
  console.log('Pricing rules seeded.');
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
