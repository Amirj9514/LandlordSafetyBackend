const { Op } = require('sequelize');
const { Service, ServiceQuestion, PricingRule } = require('../../models');
const { RULE_TYPES, RULE_SCOPES } = require('../../constants/pricingRuleTypes');
const { PRICING_MODES } = require('../../constants/propertyTypes');
const { getPrice, lineFromPrice } = require('./priceLookup');

const round2 = (n) => Math.round(n * 100) / 100;

const formatMoney = (amount) => {
  if (amount === null || amount === undefined) return null;
  return round2(amount);
};

const formatDisplayLabel = (label, amount, isTbc) => {
  if (isTbc || amount === null || amount === undefined) {
    return `${label} — TBC`;
  }
  return `${label} — £${amount.toFixed(2)}`;
};

const interpolate = (template, vars) =>
  String(template).replace(/\{(\w+)\}/g, (_, key) => (vars[key] !== undefined ? vars[key] : `{${key}}`));

const getAnswers = (selection) => selection?.answers || {};

const hasService = (selections, code) => selections.some((s) => s.code === code);

const hasBundle = (activeBundleKeys, key) => activeBundleKeys?.includes(key);

const findOption = (question, value) => {
  if (!question?.options?.length) return null;
  return question.options.find((o) => String(o.value) === String(value)) || null;
};

const resolveTierKeyFromOption = (option, tierKeyField = 'tierKey') => {
  if (!option) return null;
  return option[tierKeyField] ?? option.tierKey ?? null;
};

const resolveWhen = (when, answers, selections, activeBundleKeys) => {
  if (!when) return true;
  if (when.bundleKey && !hasBundle(activeBundleKeys, when.bundleKey)) return false;
  if (when.serviceCode && !hasService(selections, when.serviceCode)) return false;
  if (when.field !== undefined) {
    const val = answers[when.field];
    if (when.equals !== undefined && val !== when.equals) return false;
    if (when.notEquals !== undefined && val === when.notEquals) return false;
    if (when.notIn?.length && when.notIn.includes(val)) return false;
    if (when.in?.length && !when.in.includes(val)) return false;
  }
  if (when.and) return resolveWhen(when.and, answers, selections, activeBundleKeys);
  return true;
};

const resolveExtraTierKey = (config, answers) => {
  if (config.extraTierKeyWhen?.length) {
    for (const clause of config.extraTierKeyWhen) {
      if (answers[clause.field] === clause.equals) return clause.tierKey;
    }
  }
  return config.extraTierKey;
};

const resolveBaseTierKey = (config, answers) => {
  if (config.baseTierKeyWhen?.length) {
    for (const clause of config.baseTierKeyWhen) {
      if (answers[clause.field] === clause.equals) return clause.tierKey;
    }
  }
  return config.baseTierKey;
};

const evaluateAmountFromTier = (priceMap, tierKey, noRegion) => {
  const p = getPrice(priceMap, tierKey, noRegion);
  return {
    amount: p.isTbc ? null : p.amount,
    isTbc: p.isTbc,
    pricingTierId: p.pricingTierId,
  };
};

const buildLine = ({
  name,
  sub,
  amount,
  isTbc,
  pricingTierId,
  serviceCode,
  serviceName,
  isDiscount = false,
  quoteOnly = false,
}) =>
  lineFromPrice({
    name,
    sub,
    amount,
    isTbc,
    pricingTierId,
    serviceCode,
    serviceName,
    isDiscount,
    quoteOnly,
  });

const evaluateOptionTierLookup = (rule, ctx) => {
  const { config } = rule;
  const answers = getAnswers(ctx.selection);
  const value = answers[config.fieldKey];
  if (value === undefined || value === null || value === '') return [];

  const question = ctx.questionsByFieldKey?.[config.fieldKey];
  const option = findOption(question, value);
  const tierKeyField = config.tierKeyField || 'tierKey';
  const tierKey = resolveTierKeyFromOption(option, tierKeyField);
  if (!tierKey && !config.allowZeroTier) return [];

  if (config.zeroAmountWhen && answers[config.zeroAmountWhen.field] === config.zeroAmountWhen.equals) {
    return [
      buildLine({
        name: ctx.service.name,
        sub: config.sub || '',
        amount: 0,
        isTbc: false,
        pricingTierId: null,
        serviceCode: ctx.service.code,
        serviceName: ctx.service.name,
      }),
    ];
  }

  const { amount, isTbc, pricingTierId } = tierKey
    ? evaluateAmountFromTier(ctx.priceMap, tierKey, ctx.noRegion)
    : { amount: 0, isTbc: false, pricingTierId: null };

  const sub =
    config.sub ||
    (config.subTemplate
      ? interpolate(config.subTemplate, { value, ...answers })
      : option?.label ?? String(value));

  let forceTbc = isTbc;
  let quoteOnly = config.quoteOnly || false;
  if (config.forceTbcTierKeys?.includes(tierKey)) {
    forceTbc = true;
    quoteOnly = config.quoteOnlyWhenForceTbc ?? quoteOnly;
  }

  return [
    buildLine({
      name: ctx.service.name,
      sub,
      amount,
      isTbc: forceTbc,
      pricingTierId,
      serviceCode: ctx.service.code,
      serviceName: ctx.service.name,
      quoteOnly,
    }),
  ];
};

const evaluateTierKeyTemplate = (rule, ctx) => {
  const { config } = rule;
  const answers = getAnswers(ctx.selection);
  const raw = answers[config.fieldKey];
  const num = parseInt(raw, 10);
  if (config.minValue !== undefined && num < config.minValue) return [];
  if (config.maxValue !== undefined && num > config.maxValue) return [];

  const tierKey = interpolate(config.template, { value: raw, count: num });
  const { amount, isTbc, pricingTierId } = evaluateAmountFromTier(ctx.priceMap, tierKey, ctx.noRegion);
  const sub = config.subTemplate
    ? interpolate(config.subTemplate, { value: raw, count: num })
    : String(raw);

  return [
    buildLine({
      name: ctx.service.name,
      sub,
      amount,
      isTbc,
      pricingTierId,
      serviceCode: ctx.service.code,
      serviceName: ctx.service.name,
    }),
  ];
};

const evaluateBasePlusIncrement = (rule, ctx) => {
  const { config } = rule;
  const answers = getAnswers(ctx.selection);
  const count = parseInt(answers[config.fieldKey], 10) || 0;
  if (count <= 0) return [];

  const baseTierKey = resolveBaseTierKey(config, answers);
  const base = evaluateAmountFromTier(ctx.priceMap, baseTierKey, ctx.noRegion);
  let total = base.isTbc ? null : base.amount;
  let isTbc = base.isTbc;

  const included = config.includedUnits ?? 0;
  if (!isTbc && total !== null && count > included) {
    const extraTierKey = resolveExtraTierKey(config, answers);
    if (extraTierKey) {
      const extra = evaluateAmountFromTier(ctx.priceMap, extraTierKey, ctx.noRegion);
      if (extra.isTbc) {
        isTbc = true;
        total = null;
      } else {
        total = round2(total + (count - included) * extra.amount);
      }
    }
  }

  for (const addInc of config.additionalIncrements || []) {
    if (isTbc || total === null) break;
    const addCount = parseInt(answers[addInc.fieldKey], 10) || 0;
    const addIncluded = addInc.includedUnits ?? 0;
    if (addCount > addIncluded) {
      const addExtraKey = addInc.extraTierKeyWhen
        ? resolveExtraTierKey({ extraTierKey: addInc.extraTierKey, extraTierKeyWhen: addInc.extraTierKeyWhen }, answers)
        : addInc.extraTierKey;
      if (addExtraKey) {
        const addExtra = evaluateAmountFromTier(ctx.priceMap, addExtraKey, ctx.noRegion);
        if (addExtra.isTbc) {
          isTbc = true;
          total = null;
        } else {
          total = round2(total + (addCount - addIncluded) * addExtra.amount);
        }
      }
    }
  }

  const sub = config.subTemplate
    ? interpolate(config.subTemplate, { ...answers, count, value: answers[config.fieldKey] })
    : String(count);

  return [
    buildLine({
      name: ctx.service.name,
      sub,
      amount: total,
      isTbc: isTbc || total === null,
      pricingTierId: base.pricingTierId,
      serviceCode: ctx.service.code,
      serviceName: ctx.service.name,
    }),
  ];
};

const resolveComponentSub = (comp, val, answers, ctx) => {
  const question = ctx.questionsByFieldKey?.[comp.fieldKey];
  const option = findOption(question, val);
  const label = option?.label ?? String(val);
  const vars = { value: val, label, ...answers };

  if (comp.subTemplate) {
    return interpolate(comp.subTemplate, vars);
  }
  return label;
};

const resolveComponentTierKey = (comp, val) => {
  let tierKey = comp.tierKey;
  if (comp.tierKeyMap && val !== undefined) {
    tierKey = comp.tierKeyMap[val];
  }
  if (comp.tierKeyTemplate) {
    tierKey = interpolate(comp.tierKeyTemplate, { value: val });
  }
  return tierKey;
};

const evaluateMultiFieldSum = (rule, ctx) => {
  const { config } = rule;
  const answers = getAnswers(ctx.selection);
  const lines = [];

  for (const comp of config.components || []) {
    const val = answers[comp.fieldKey];
    if (val === undefined || val === null || val === '') continue;
    if (comp.skipWhenValue !== undefined && String(val) === String(comp.skipWhenValue)) {
      continue;
    }

    const tierKey = resolveComponentTierKey(comp, val);
    if (!tierKey) continue;

    const part = evaluateAmountFromTier(ctx.priceMap, tierKey, ctx.noRegion);
    const sub = resolveComponentSub(comp, val, answers, ctx);

    lines.push(
      buildLine({
        name: ctx.service.name,
        sub,
        amount: part.amount,
        isTbc: part.isTbc,
        pricingTierId: part.pricingTierId,
        serviceCode: ctx.service.code,
        serviceName: ctx.service.name,
      })
    );
  }

  return lines;
};

const evaluateFlatPlusExtraUnits = (rule, ctx) => {
  const { config } = rule;
  const answers = getAnswers(ctx.selection);
  const count = parseInt(answers[config.fieldKey], 10) || 0;
  if (count <= 0) return [];

  let flatTierKey = config.flatTierKey;
  let extraTierKey = config.extraTierKey;
  const flatUpTo = config.flatUpTo ?? 10;

  if (config.variantWhen) {
    const v = config.variantWhen;
    const match =
      (!v.bundleKey || hasBundle(ctx.activeBundleKeys, v.bundleKey)) &&
      (!v.requiresServiceCode || hasService(ctx.selections, v.requiresServiceCode));
    if (match) {
      flatTierKey = v.flatTierKey || flatTierKey;
      extraTierKey = v.extraTierKey || extraTierKey;
    }
  }

  let price = null;
  let isTbc = ctx.noRegion || !ctx.priceMap;
  if (!isTbc) {
    const flat = evaluateAmountFromTier(ctx.priceMap, flatTierKey, ctx.noRegion);
    const perExtra = evaluateAmountFromTier(ctx.priceMap, extraTierKey, ctx.noRegion);
    if (flat.isTbc) isTbc = true;
    else {
      price =
        count <= flatUpTo
          ? flat.amount
          : round2(flat.amount + (count - flatUpTo) * (perExtra.isTbc ? 0 : perExtra.amount));
      if (count > flatUpTo && perExtra.isTbc) isTbc = true;
    }
  }

  const sub = config.subTemplate
    ? interpolate(config.subTemplate, { count })
    : `${count} appliance${count > 1 ? 's' : ''}`;

  const lines = [
    buildLine({
      name: ctx.service.name,
      sub,
      amount: price,
      isTbc,
      pricingTierId: null,
      serviceCode: ctx.service.code,
      serviceName: ctx.service.name,
    }),
  ];

  return lines;
};

const evaluateConditionalAddon = (rule, ctx) => {
  const answers = getAnswers(ctx.selection);
  if (!resolveWhen(rule.config.when, answers, ctx.selections, ctx.activeBundleKeys)) return [];

  const { amount, isTbc, pricingTierId } = evaluateAmountFromTier(
    ctx.priceMap,
    rule.config.tierKey,
    ctx.noRegion
  );

  return [
    buildLine({
      name: rule.config.lineName || rule.config.name || 'Add-on',
      sub: rule.config.sub || '',
      amount,
      isTbc,
      pricingTierId,
      serviceCode: ctx.service.code,
      serviceName: ctx.service.name,
    }),
  ];
};

const evaluateTierRangeMap = (rule, ctx) => {
  const { config } = rule;
  const answers = getAnswers(ctx.selection);
  const beds = parseInt(answers[config.bedFieldKey || 'bedrooms'], 10) || 0;
  const floors = parseInt(answers[config.floorFieldKey || 'floors'], 10) || 1;
  if (beds <= 0) return [];

  let tierKey = config.defaultTierKey;
  for (const range of config.ranges || []) {
    if (beds >= range.min && beds <= range.max) {
      tierKey = range.tierKey;
      break;
    }
  }
  if (!tierKey) {
    const maxRange = Math.max(...(config.ranges || []).map((r) => r.max), 0);
    if (config.forceTbcAboveMax && beds > maxRange) {
      return [
        buildLine({
          name: ctx.service.name,
          sub: config.subTemplate
            ? interpolate(config.subTemplate, { beds, floors, ...answers })
            : `${beds} units`,
          amount: null,
          isTbc: true,
          quoteOnly: true,
          pricingTierId: null,
          serviceCode: ctx.service.code,
          serviceName: ctx.service.name,
        }),
      ];
    }
    return [];
  }

  const base = evaluateAmountFromTier(ctx.priceMap, tierKey, ctx.noRegion);
  let total = base.isTbc ? null : base.amount;
  let isTbc = base.isTbc;

  if (!isTbc && floors > (config.includedFloors ?? 1) && config.floorExtraTierKey) {
    const floorExtra = evaluateAmountFromTier(ctx.priceMap, config.floorExtraTierKey, ctx.noRegion);
    if (floorExtra.isTbc) {
      isTbc = true;
      total = null;
    } else {
      total = round2(total + (floors - (config.includedFloors ?? 1)) * floorExtra.amount);
    }
  }

  const sub = config.subTemplate
    ? interpolate(config.subTemplate, { beds, floors, ...answers })
    : `${beds} beds, ${floors} floors`;

  return [
    buildLine({
      name: ctx.service.name,
      sub,
      amount: total,
      isTbc: isTbc || total === null,
      pricingTierId: base.pricingTierId,
      serviceCode: ctx.service.code,
      serviceName: ctx.service.name,
    }),
  ];
};

const evaluateForceTbc = (rule, ctx) => {
  const answers = getAnswers(ctx.selection);
  if (!resolveWhen(rule.config.when, answers, ctx.selections, ctx.activeBundleKeys)) return [];

  return [
    buildLine({
      name: ctx.service.name,
      sub: rule.config.sub || 'Custom configuration — quote required',
      amount: null,
      isTbc: true,
      quoteOnly: true,
      pricingTierId: null,
      serviceCode: ctx.service.code,
      serviceName: ctx.service.name,
    }),
  ];
};

const evaluateQuoteOnly = (rule, ctx) =>
  [
    buildLine({
      name: ctx.service.name,
      sub: rule.config.sub || 'Quote on request',
      amount: null,
      isTbc: false,
      quoteOnly: true,
      pricingTierId: null,
      serviceCode: ctx.service.code,
      serviceName: ctx.service.name,
    }),
  ];

const evaluateStartsFrom = (rule, ctx) => {
  const meta = ctx.service.metadata || {};
  const tierKey = rule.config.tierKey || meta.startsFromTierKey;
  const p = tierKey
    ? evaluateAmountFromTier(ctx.priceMap, tierKey, ctx.noRegion)
    : { amount: meta.startsFrom ?? rule.config.staticAmount ?? null, isTbc: ctx.noRegion, pricingTierId: null };
  const amount = tierKey ? p.amount : meta.startsFrom ?? rule.config.staticAmount;

  return [
    buildLine({
      name: ctx.service.name,
      sub:
        amount != null
          ? `Starts from £${Number(amount).toFixed(2)}`
          : rule.config.sub || 'Starts from — TBC',
      amount: null,
      isTbc: ctx.noRegion || amount === null,
      quoteOnly: true,
      pricingTierId: p.pricingTierId ?? null,
      serviceCode: ctx.service.code,
      serviceName: ctx.service.name,
    }),
  ];
};

const evaluateBundleDiscount = (rule, ctx) => {
  const { config } = rule;
  if (config.bundleKey && !hasBundle(ctx.activeBundleKeys, config.bundleKey)) return [];
  if (config.requiredServiceCodes?.some((c) => !hasService(ctx.selections, c))) return [];

  let tierKey = config.discountTierKey;
  if (config.discountTierKeyFromField) {
    const src = config.discountTierKeyFromField;
    const sel = ctx.selections.find((s) => s.code === src.serviceCode);
    const val = getAnswers(sel)[src.fieldKey];
    tierKey = src.map?.[val];
  }
  if (!tierKey) return [];

  if (config.onlyWhenServiceSelected && !hasService(ctx.selections, config.onlyWhenServiceSelected)) {
    return [];
  }

  const disc = evaluateAmountFromTier(ctx.priceMap, tierKey, ctx.noRegion);
  if (disc.isTbc || disc.amount === null) return [];

  return [
    buildLine({
      name: config.lineLabel || 'Bundle Discount',
      sub: config.sub || 'Bundle selected',
      amount: -disc.amount,
      isTbc: false,
      pricingTierId: disc.pricingTierId,
      isDiscount: true,
    }),
  ];
};

const evaluateBookingSurcharge = (rule, ctx) => {
  const { config } = rule;
  if (config.applyWhen) {
    const fieldVal = ctx.bookingFlags?.[config.applyWhen.field];
    if (config.applyWhen.equals !== undefined && fieldVal !== config.applyWhen.equals) return [];
    if (config.applyWhen.notEquals !== undefined && fieldVal === config.applyWhen.notEquals) return [];
  }

  const { amount, isTbc, pricingTierId } = evaluateAmountFromTier(
    ctx.priceMap,
    config.tierKey,
    ctx.noRegion
  );

  return [
    buildLine({
      name: config.lineName || config.name,
      sub: config.sub || '',
      amount,
      isTbc,
      pricingTierId,
    }),
  ];
};

const RULE_EVALUATORS = {
  [RULE_TYPES.OPTION_TIER_LOOKUP]: evaluateOptionTierLookup,
  [RULE_TYPES.TIER_KEY_TEMPLATE]: evaluateTierKeyTemplate,
  [RULE_TYPES.BASE_PLUS_INCREMENT]: evaluateBasePlusIncrement,
  [RULE_TYPES.MULTI_FIELD_SUM]: evaluateMultiFieldSum,
  [RULE_TYPES.FLAT_PLUS_EXTRA_UNITS]: evaluateFlatPlusExtraUnits,
  [RULE_TYPES.CONDITIONAL_ADDON]: evaluateConditionalAddon,
  [RULE_TYPES.TIER_RANGE_MAP]: evaluateTierRangeMap,
  [RULE_TYPES.FORCE_TBC]: evaluateForceTbc,
  [RULE_TYPES.QUOTE_ONLY]: evaluateQuoteOnly,
  [RULE_TYPES.STARTS_FROM]: evaluateStartsFrom,
  [RULE_TYPES.BUNDLE_DISCOUNT]: evaluateBundleDiscount,
  [RULE_TYPES.BOOKING_SURCHARGE]: evaluateBookingSurcharge,
};

const evaluateRule = (rule, ctx) => {
  const fn = RULE_EVALUATORS[rule.ruleType];
  if (!fn) return [];
  return fn(rule, ctx);
};

const buildQuestionsByFieldKey = (questions = []) =>
  Object.fromEntries(questions.map((q) => [q.fieldKey, q]));

const evaluateServiceRules = (service, selection, rules, ctx) => {
  const questions = ctx.questionsByServiceId?.[service.id] || [];
  const serviceCtx = {
    ...ctx,
    service,
    selection,
    questionsByFieldKey: buildQuestionsByFieldKey(questions),
  };

  const lines = [];
  const serviceRules = rules
    .filter((r) => r.serviceId === service.id && r.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const rule of serviceRules) {
    if (rule.scope === RULE_SCOPES.BUNDLE_DISCOUNT || rule.scope === RULE_SCOPES.BOOKING_SURCHARGE) {
      continue;
    }
    lines.push(...evaluateRule(rule, serviceCtx));
  }
  return lines;
};

const evaluateResidentialLinesFromRules = (selections, activeBundleKeys, priceMap, noRegion, context) => {
  const lines = [];
  const { servicesByCode, rules, questionsByServiceId } = context;

  for (const selection of selections) {
    const service = servicesByCode[selection.code];
    if (!service) continue;
    lines.push(
      ...evaluateServiceRules(service, selection, rules, {
        selections,
        activeBundleKeys,
        priceMap,
        noRegion,
        questionsByServiceId,
      })
    );
  }

  const appliedGroups = new Set();
  const bundleRules = rules
    .filter((r) => r.scope === RULE_SCOPES.BUNDLE_DISCOUNT && r.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const rule of bundleRules) {
    const group = rule.config?.exclusionGroup;
    if (group && appliedGroups.has(group)) continue;

    const discountLines = evaluateRule(rule, {
      selections,
      activeBundleKeys,
      priceMap,
      noRegion,
      service: { code: null, name: '' },
      selection: null,
    });

    if (discountLines.length) {
      lines.push(...discountLines);
      if (group) appliedGroups.add(group);
    }
  }

  return lines;
};

const evaluateQuoteOnlyLinesFromRules = (selections, priceMap, noRegion, context) => {
  const lines = [];
  const { servicesByCode, rules } = context;

  for (const selection of selections) {
    const service = servicesByCode[selection.code];
    if (!service) continue;

    const serviceRules = rules
      .filter((r) => r.serviceId === service.id && r.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (serviceRules.length) {
      lines.push(
        ...evaluateServiceRules(service, selection, rules, {
          selections,
          activeBundleKeys: [],
          priceMap,
          noRegion,
          questionsByServiceId: context.questionsByServiceId,
        })
      );
      continue;
    }

    if (service.pricingMode === PRICING_MODES.QUOTE_ONLY) {
      lines.push(
        ...evaluateQuoteOnly({ config: {} }, { service, selection, priceMap, noRegion })
      );
    } else if (service.pricingMode === PRICING_MODES.STARTS_FROM) {
      lines.push(
        ...evaluateStartsFrom({ config: {} }, { service, selection, priceMap, noRegion })
      );
    }
  }
  return lines;
};

const evaluateBookingSurcharges = (rules, bookingFlags, priceMap, noRegion) => {
  const surchargeRules = rules
    .filter((r) => r.scope === RULE_SCOPES.BOOKING_SURCHARGE && r.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const lines = [];
  for (const rule of surchargeRules) {
    lines.push(
      ...evaluateRule(rule, {
        bookingFlags,
        priceMap,
        noRegion,
        service: { code: null, name: '' },
        selection: null,
        selections: [],
        activeBundleKeys: [],
      })
    );
  }
  return lines;
};

const previewOptionPrice = (serviceCode, fieldKey, option, rule, priceMap, noRegion, ctx = {}) => {
  const raw = typeof option === 'string' ? { value: option, label: option } : { ...option };
  const mockService = { code: serviceCode, name: serviceCode, id: ctx.serviceId };
  const mockSelection = { code: serviceCode, answers: { [fieldKey]: raw.value, ...ctx.previewAnswers } };
  const mockQuestion = { fieldKey, options: [raw] };

  const serviceCtx = {
    service: mockService,
    selection: mockSelection,
    questionsByFieldKey: { [fieldKey]: mockQuestion },
    priceMap,
    noRegion,
    selections: [mockSelection],
    activeBundleKeys: ctx.activeBundleKeys || [],
  };

  const lines = evaluateRule(rule, serviceCtx);
  if (!lines.length) return null;
  const line = lines[0];
  return {
    amount: line.isTbc || line.quoteOnly ? null : formatMoney(line.total),
    isTbc: line.isTbc,
    displayLabel: formatDisplayLabel(raw.label ?? raw.value, line.total, line.isTbc),
  };
};

const previewMultiFieldComponent = (rule, question, option, priceMap, noRegion) => {
  const raw = typeof option === 'string' ? { value: option, label: option } : { ...option };
  const comp = (rule.config?.components || []).find((c) => c.fieldKey === question.fieldKey);
  if (!comp) return null;

  const val = raw.value;
  if (comp.skipWhenValue !== undefined && String(val) === String(comp.skipWhenValue)) {
    const label = raw.label ?? raw.value;
    return {
      amount: formatMoney(0),
      isTbc: false,
      displayLabel: `${label} — included`,
    };
  }

  const tierKey = resolveComponentTierKey(comp, val);
  if (!tierKey) return null;

  const part = evaluateAmountFromTier(priceMap, tierKey, noRegion);
  const label = raw.label ?? raw.value;
  const suffix = comp.amountMode === 'additive' ? ' add-on' : '';
  return {
    amount: part.isTbc ? null : formatMoney(part.amount),
    isTbc: part.isTbc,
    displayLabel: formatDisplayLabel(`${label}${suffix}`, part.amount, part.isTbc),
  };
};

const enrichOptionWithRules = (service, question, option, rules, priceMap, noRegion, ctx = {}) => {
  const raw = typeof option === 'string' ? { value: option, label: option } : { ...option };
  const fieldRules = rules
    .filter(
      (r) =>
        r.serviceId === service.id &&
        r.isActive &&
        r.config?.fieldKey === question.fieldKey &&
        r.scope !== RULE_SCOPES.BUNDLE_DISCOUNT &&
        r.scope !== RULE_SCOPES.BOOKING_SURCHARGE
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const rule of fieldRules) {
    const preview = previewOptionPrice(
      service.code,
      question.fieldKey,
      raw,
      rule,
      priceMap,
      noRegion,
      ctx
    );
    if (preview) {
      return {
        ...raw,
        label: raw.label ?? raw.value,
        price: preview.amount,
        isTbc: preview.isTbc,
        displayLabel: preview.displayLabel,
        tierKey: raw.tierKey ?? null,
      };
    }
  }

  const multiFieldRules = rules
    .filter(
      (r) =>
        r.serviceId === service.id &&
        r.isActive &&
        r.ruleType === RULE_TYPES.MULTI_FIELD_SUM &&
        r.config?.components?.some((c) => c.fieldKey === question.fieldKey) &&
        r.scope !== RULE_SCOPES.BUNDLE_DISCOUNT &&
        r.scope !== RULE_SCOPES.BOOKING_SURCHARGE
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const rule of multiFieldRules) {
    const preview = previewMultiFieldComponent(rule, question, raw, priceMap, noRegion);
    if (preview) {
      return {
        ...raw,
        label: raw.label ?? raw.value,
        price: preview.amount,
        isTbc: preview.isTbc,
        displayLabel: preview.displayLabel,
        tierKey: raw.tierKey ?? null,
      };
    }
  }

  if (raw.tierKey) {
    const p = getPrice(priceMap, raw.tierKey, noRegion);
    const amount = p.isTbc ? null : formatMoney(p.amount);
    return {
      ...raw,
      label: raw.label ?? raw.value,
      price: amount,
      isTbc: p.isTbc,
      displayLabel: formatDisplayLabel(raw.label ?? raw.value, amount, p.isTbc),
      tierKey: raw.tierKey,
    };
  }

  return {
    ...raw,
    label: raw.label ?? raw.value,
    price: null,
    isTbc: noRegion || !priceMap,
    displayLabel: raw.label ?? raw.value,
  };
};

const enrichQuestionWithRules = (service, question, rules, priceMap, noRegion, ctx = {}) => {
  const q = { ...question };
  if (!q.options?.length) return q;

  q.options = q.options.map((opt) =>
    enrichOptionWithRules(service, q, opt, rules, priceMap, noRegion, ctx)
  );

  const flatRule = rules.find(
    (r) =>
      r.serviceId === service.id &&
      r.ruleType === RULE_TYPES.FLAT_PLUS_EXTRA_UNITS &&
      r.config?.fieldKey === q.fieldKey
  );
  if (flatRule) {
    const cfg = flatRule.config;
    let flatKey = cfg.flatTierKey;
    let extraKey = cfg.extraTierKey;
    if (cfg.variantWhen) {
      flatKey = cfg.variantWhen.flatTierKey || flatKey;
      extraKey = cfg.variantWhen.extraTierKey || extraKey;
    }
    const flat = getPrice(priceMap, flatKey, noRegion);
    const extra = getPrice(priceMap, extraKey, noRegion);
    q.pricingHint = {
      flatRate1to10: flat.isTbc ? null : formatMoney(flat.amount),
      perExtraAppliance: extra.isTbc ? null : formatMoney(extra.amount),
      isTbc: flat.isTbc || extra.isTbc,
      displayText:
        !flat.isTbc && flat.amount !== null
          ? `1–${cfg.flatUpTo ?? 10} appliances: £${flat.amount.toFixed(2)} flat rate. Each above ${cfg.flatUpTo ?? 10}: +£${(extra.amount ?? 0).toFixed(2)} each.`
          : null,
    };
  }

  return q;
};

const loadPricingContext = async (propertyType, serviceCodes = []) => {
  const serviceWhere = { propertyType };
  if (serviceCodes.length) {
    serviceWhere.code = { [Op.in]: serviceCodes };
  }

  const services = await Service.findAll({ where: serviceWhere });
  const serviceIds = services.map((s) => s.id);

  const allPropertyServices = await Service.findAll({
    where: { propertyType },
    attributes: ['id', 'code', 'name', 'pricingMode', 'metadata'],
  });
  const allIds = allPropertyServices.map((s) => s.id);

  const questions = await ServiceQuestion.findAll({
    where: { serviceId: { [Op.in]: allIds } },
  });

  const rules = await PricingRule.findAll({
    where: {
      isActive: true,
      [Op.or]: [
        { serviceId: { [Op.in]: allIds } },
        { scope: RULE_SCOPES.BUNDLE_DISCOUNT },
        { scope: RULE_SCOPES.BOOKING_SURCHARGE },
      ],
    },
    order: [['sortOrder', 'ASC']],
  });

  const servicesByCode = Object.fromEntries(allPropertyServices.map((s) => [s.code, s]));
  const questionsByServiceId = {};
  for (const q of questions) {
    if (!questionsByServiceId[q.serviceId]) questionsByServiceId[q.serviceId] = [];
    questionsByServiceId[q.serviceId].push(q);
  }

  return {
    servicesByCode,
    rules,
    questionsByServiceId,
  };
};

module.exports = {
  RULE_TYPES,
  RULE_SCOPES,
  formatDisplayLabel,
  formatMoney,
  evaluateRule,
  evaluateServiceRules,
  evaluateResidentialLinesFromRules,
  evaluateQuoteOnlyLinesFromRules,
  evaluateBookingSurcharges,
  enrichOptionWithRules,
  enrichQuestionWithRules,
  resolveWhen,
  interpolate,
  loadPricingContext,
};
