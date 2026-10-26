const { PricingRule } = require('../models');
const { RULE_SCOPES } = require('../constants/pricingRuleTypes');
const { getPrice } = require('./pricing/priceLookup');
const {
  enrichQuestionWithRules,
  formatDisplayLabel,
  formatMoney,
  variantBundleFigures,
} = require('./pricing/pricingEngine');

/** The CP12 + boiler bundle rule (per service-level variants), if seeded. */
const findGscBoilerBundleRule = (rules) =>
  rules.find((r) => r.isActive && r.config?.variants && r.config?.variantFieldKey === 'boilerAddon');

const enrichBoilerOption = (option, priceMap, noRegion) => {
  const raw = { ...option };
  const label = raw.label || `${String(raw.value).charAt(0).toUpperCase()}${String(raw.value).slice(1)} Service`;
  const standaloneKey = raw.tierKeyStandalone || raw.tierKey;
  const standalone = getPrice(priceMap, standaloneKey, noRegion);
  const standaloneAmount = standalone.isTbc ? null : formatMoney(standalone.amount);

  return {
    ...raw,
    label,
    tierKeyStandalone: standaloneKey,
    price: standaloneAmount,
    isTbc: standalone.isTbc,
    displayLabel: formatDisplayLabel(label, standaloneAmount, standalone.isTbc),
  };
};

// "Add a boiler service?" inside the CP12 form: each option shows the CP12 + service bundle price.
const enrichBoilerAddonOption = (option, priceMap, noRegion, bundleRule) => {
  const raw = { ...option };
  if (raw.value === 'none') {
    return { ...raw, price: null, isTbc: false, displayLabel: raw.label };
  }
  const label = raw.label || raw.value;
  const shortName = label.replace(/\s+Service$/i, '');
  const figures = bundleRule && !noRegion ? variantBundleFigures(bundleRule.config, raw.value, 1, priceMap, noRegion) : null;
  const total = figures ? formatMoney(figures.total) : null;
  return {
    ...raw,
    label,
    price: total,
    isTbc: total === null,
    displayLabel: formatDisplayLabel(`CP12 + ${shortName}`, total, total === null),
  };
};

const enrichServiceQuestions = async (service, priceMap, noRegion, rules) => {
  const bundleRule = findGscBoilerBundleRule(rules);
  const questions = (service.questions || []).map((q) => {
    if (service.code === 'boiler' && q.fieldKey === 'boilerType') {
      return {
        ...q,
        options: (q.options || []).map((opt) => enrichBoilerOption(opt, priceMap, noRegion)),
      };
    }
    if (service.code === 'gsc' && q.fieldKey === 'boilerAddon') {
      return {
        ...q,
        options: (q.options || []).map((opt) => enrichBoilerAddonOption(opt, priceMap, noRegion, bundleRule)),
      };
    }
    return enrichQuestionWithRules(service, q, rules, priceMap, noRegion);
  });

  const children = await Promise.all(
    (service.children || []).map((child) => enrichServiceQuestions(child, priceMap, noRegion, rules))
  );

  return { ...service, questions, children };
};

const enrichCatalogWithPrices = async (catalog, priceMap, region, postcodeFormatted) => {
  const noRegion = !region || !priceMap;

  const rules = await PricingRule.findAll({
    where: { isActive: true },
    order: [['sortOrder', 'ASC']],
  });

  const categories = await Promise.all(
    catalog.categories.map(async (cat) => ({
      ...cat,
      services: await Promise.all(
        cat.services.map((svc) => enrichServiceQuestions(svc, priceMap, noRegion, rules))
      ),
    }))
  );

  return {
    ...catalog,
    postcode: postcodeFormatted ?? null,
    resolvedRegion: region ? { id: region.id, name: region.name } : null,
    hasPricing: !noRegion,
    categories,
  };
};

module.exports = {
  enrichCatalogWithPrices,
  formatDisplayLabel,
};
