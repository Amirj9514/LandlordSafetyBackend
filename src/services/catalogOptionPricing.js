const { PricingRule } = require('../models');
const { RULE_SCOPES } = require('../constants/pricingRuleTypes');
const { getPrice } = require('./pricing/priceLookup');
const {
  enrichQuestionWithRules,
  formatDisplayLabel,
  formatMoney,
} = require('./pricing/pricingEngine');

const enrichBoilerOption = (option, priceMap, noRegion) => {
  const raw = { ...option };
  const label = raw.label || (raw.value === 'basic' ? 'Basic Service' : 'Full Service');
  const standaloneKey = raw.tierKeyStandalone;
  const bundleKey = raw.tierKeyBundle;
  const standalone = getPrice(priceMap, standaloneKey, noRegion);
  const bundle = getPrice(priceMap, bundleKey, noRegion);
  const standaloneAmount = standalone.isTbc ? null : formatMoney(standalone.amount);
  const bundleAmount = bundle.isTbc ? null : formatMoney(bundle.amount);

  return {
    ...raw,
    label,
    tierKeyStandalone: standaloneKey,
    tierKeyBundle: bundleKey,
    price: standaloneAmount,
    priceStandalone: standaloneAmount,
    priceBundleAddon: bundleAmount,
    isTbc: standalone.isTbc,
    isTbcStandalone: standalone.isTbc,
    isTbcBundleAddon: bundle.isTbc,
    displayLabel: formatDisplayLabel(label, standaloneAmount, standalone.isTbc),
    displayLabelStandalone: formatDisplayLabel(label, standaloneAmount, standalone.isTbc),
    displayLabelBundle: formatDisplayLabel(label, bundleAmount, bundle.isTbc),
  };
};

const enrichServiceQuestions = async (service, priceMap, noRegion, rules) => {
  const questions = (service.questions || []).map((q) => {
    if (service.code === 'boiler' && q.fieldKey === 'boilerType') {
      return {
        ...q,
        options: (q.options || []).map((opt) => enrichBoilerOption(opt, priceMap, noRegion)),
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
