const { getPrice } = require('./pricing/priceLookup');

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

const resolveTierAmount = (priceMap, noRegion, tierKey) => {
  if (!tierKey) return { amount: null, isTbc: true };
  const p = getPrice(priceMap, tierKey, noRegion);
  return { amount: p.isTbc ? null : formatMoney(p.amount), isTbc: p.isTbc };
};

const normalizeRawOption = (option) => {
  if (typeof option === 'string') {
    return { value: option, label: option };
  }
  return { ...option };
};

const buildPricedOption = (base, { label, amount, isTbc, tierKey, extra = {} }) => ({
  ...base,
  ...extra,
  label,
  price: amount,
  isTbc,
  tierKey: tierKey ?? base.tierKey ?? null,
  displayLabel: formatDisplayLabel(label, amount, isTbc),
});

const enrichGscApplianceOption = (option, priceMap, noRegion) => {
  const n = option.value;
  const tierKey = option.tierKey || `gsc_meter_${n}`;
  const label = `Meter & ${n} appliance${n !== '1' ? 's' : ''}`;
  const { amount, isTbc } = resolveTierAmount(priceMap, noRegion, tierKey);
  return buildPricedOption(option, { label, amount, isTbc, tierKey });
};

const enrichBoilerTypeOption = (option, priceMap, noRegion) => {
  const label =
    option.label || (option.value === 'basic' ? 'Basic Service' : 'Full Service');
  const standaloneKey = option.tierKeyStandalone;
  const bundleKey = option.tierKeyBundle;
  const standalone = resolveTierAmount(priceMap, noRegion, standaloneKey);
  const bundle = resolveTierAmount(priceMap, noRegion, bundleKey);

  return {
    ...option,
    label,
    tierKeyStandalone: standaloneKey,
    tierKeyBundle: bundleKey,
    price: standalone.amount,
    priceStandalone: standalone.amount,
    priceBundleAddon: bundle.amount,
    isTbc: standalone.isTbc,
    isTbcStandalone: standalone.isTbc,
    isTbcBundleAddon: bundle.isTbc,
    displayLabel: formatDisplayLabel(label, standalone.amount, standalone.isTbc),
    displayLabelStandalone: formatDisplayLabel(label, standalone.amount, standalone.isTbc),
    displayLabelBundle: formatDisplayLabel(label, bundle.amount, bundle.isTbc),
  };
};

const enrichEicrBedroomOption = (option, priceMap, noRegion) => {
  let label = option.label ?? option.value;
  if (option.value === 'studio') label = 'Studio';
  else if (option.value === '1-3') label = '1–3 Bedrooms';
  else if (/^\d+$/.test(option.value)) label = `${option.value} Bedrooms`;

  const { amount, isTbc } = resolveTierAmount(priceMap, noRegion, option.tierKey);
  return buildPricedOption(option, { label, amount, isTbc, tierKey: option.tierKey });
};

const enrichEicrFuseBoardOption = (option, priceMap, noRegion) => {
  if (option.value === '1') {
    return buildPricedOption(option, {
      label: option.label || '1 fuse board (included)',
      amount: 0,
      isTbc: false,
      tierKey: null,
    });
  }
  const { amount, isTbc } = resolveTierAmount(priceMap, noRegion, option.tierKey);
  const label = `${option.value} fuse boards (+${isTbc || amount === null ? 'TBC' : `£${amount.toFixed(2)}`})`;
  return buildPricedOption(option, { label, amount, isTbc, tierKey: option.tierKey });
};

const enrichFscAlarmOption = (option, priceMap, noRegion, propertySubtype = 'standard') => {
  const count = parseInt(option.value, 10) || 0;
  const baseKey = propertySubtype === 'premium' ? 'fsc_premium_base' : 'fsc_standard_base';
  const base = resolveTierAmount(priceMap, noRegion, baseKey);
  let amount = base.amount;
  let isTbc = base.isTbc;

  if (!isTbc && amount !== null && count > 3) {
    const extra = resolveTierAmount(priceMap, noRegion, 'fsc_alarm_extra');
    if (extra.isTbc) {
      isTbc = true;
      amount = null;
    } else {
      amount = round2(amount + (count - 3) * extra.amount);
    }
  }

  const label = option.label || String(option.value);
  return buildPricedOption(option, { label, amount, isTbc, tierKey: option.tierKey });
};

const enrichElcLightOption = (option, priceMap, noRegion) => {
  const count = parseInt(option.value, 10) || 0;
  const base = resolveTierAmount(priceMap, noRegion, 'elc_base');
  let amount = base.amount;
  let isTbc = base.isTbc;

  if (!isTbc && amount !== null && count > 3) {
    const extra = resolveTierAmount(priceMap, noRegion, 'elc_light_extra');
    if (extra.isTbc) {
      isTbc = true;
      amount = null;
    } else {
      amount = round2(amount + (count - 3) * extra.amount);
    }
  }

  const label = option.label || String(option.value);
  return buildPricedOption(option, { label, amount, isTbc, tierKey: option.tierKey });
};

const enrichSimpleTierOption = (option, priceMap, noRegion) => {
  const label = option.label ?? option.value;
  const { amount, isTbc } = resolveTierAmount(priceMap, noRegion, option.tierKey);
  return buildPricedOption(option, { label, amount, isTbc, tierKey: option.tierKey });
};

const enrichOption = (serviceCode, fieldKey, option, priceMap, noRegion, ctx = {}) => {
  const raw = normalizeRawOption(option);

  if (serviceCode === 'gsc' && fieldKey === 'applianceCount') {
    return enrichGscApplianceOption(raw, priceMap, noRegion);
  }
  if (serviceCode === 'boiler' && fieldKey === 'boilerType') {
    return enrichBoilerTypeOption(raw, priceMap, noRegion);
  }
  if (serviceCode === 'eicr' && fieldKey === 'bedrooms') {
    return enrichEicrBedroomOption(raw, priceMap, noRegion);
  }
  if (serviceCode === 'eicr' && fieldKey === 'fuseBoards') {
    return enrichEicrFuseBoardOption(raw, priceMap, noRegion);
  }
  if (serviceCode === 'fsc' && fieldKey === 'alarmCount') {
    return enrichFscAlarmOption(raw, priceMap, noRegion, ctx.fscPropertySubtype);
  }
  if (serviceCode === 'elc' && fieldKey === 'lightCount') {
    return enrichElcLightOption(raw, priceMap, noRegion);
  }
  if (raw.tierKey) {
    return enrichSimpleTierOption(raw, priceMap, noRegion);
  }

  return {
    ...raw,
    label: raw.label ?? raw.value,
    price: null,
    isTbc: noRegion || !priceMap,
    displayLabel: raw.label ?? raw.value,
  };
};

const enrichQuestion = (serviceCode, question, priceMap, noRegion) => {
  const q = { ...question };
  if (!q.options?.length) return q;

  const ctx = {};
  if (serviceCode === 'fsc') {
    const subtypeQ = (question.options && serviceCode) ? null : null;
    const proptypeField = 'propertySubtype';
    // default FSC subtype for alarm pricing when enriching full catalog
    ctx.fscPropertySubtype = 'standard';
  }

  q.options = q.options.map((opt) =>
    enrichOption(serviceCode, q.fieldKey, opt, priceMap, noRegion, ctx)
  );

  if (serviceCode === 'pat' && q.fieldKey === 'applianceCount') {
    const flat = resolveTierAmount(priceMap, noRegion, 'pat_flat_1_10');
    const extra = resolveTierAmount(priceMap, noRegion, 'pat_per_extra_appliance');
    q.pricingHint = {
      flatRate1to10: flat.amount,
      perExtraAppliance: extra.amount,
      isTbc: flat.isTbc || extra.isTbc,
      displayText:
        flat.amount !== null
          ? `1–10 appliances: £${flat.amount.toFixed(2)} flat rate. Each above 10: +£${(extra.amount ?? 2).toFixed(2)} each.`
          : null,
    };
  }

  return q;
};

const enrichServiceQuestions = (service, priceMap, noRegion) => {
  const code = service.code;
  const questions = (service.questions || []).map((q) =>
    enrichQuestion(code, q, priceMap, noRegion)
  );
  const children = (service.children || []).map((child) =>
    enrichServiceQuestions(child, priceMap, noRegion)
  );
  return { ...service, questions, children };
};

const enrichCatalogWithPrices = (catalog, priceMap, region, postcodeFormatted) => {
  const noRegion = !region || !priceMap;

  return {
    ...catalog,
    postcode: postcodeFormatted ?? null,
    resolvedRegion: region ? { id: region.id, name: region.name } : null,
    hasPricing: !noRegion,
    categories: catalog.categories.map((cat) => ({
      ...cat,
      services: cat.services.map((svc) => enrichServiceQuestions(svc, priceMap, noRegion)),
    })),
  };
};

module.exports = {
  enrichCatalogWithPrices,
  enrichOption,
  formatDisplayLabel,
};
