const { calculateQuote, inferActiveBundles } = require('./pricing/quoteCalculator');
const { PROPERTY_TYPES } = require('../constants/propertyTypes');
const { resolveRegionByPostcode, normalizePostcode } = require('./pricing/regionResolver');
const { loadRegionPriceMap } = require('./pricing/priceLookup');

const previewQuote = async (body) => {
  const {
    propertyType,
    postcode,
    services = [],
    activeBundleKeys,
    congestionZone = false,
    parkingAvailable = true,
  } = body;

  if (!propertyType || !postcode) {
    const error = new Error('propertyType and postcode are required');
    error.status = 400;
    throw error;
  }

  const bundles = Array.isArray(activeBundleKeys)
    ? activeBundleKeys
    : await inferActiveBundles(propertyType, services);

  const quote = await calculateQuote({
    propertyType,
    postcode,
    services,
    activeBundleKeys: bundles,
    congestionZone,
    parkingAvailable,
  });

  return {
    ...quote,
    activeBundleKeys: bundles,
    cta:
      propertyType === PROPERTY_TYPES.RESIDENTIAL
        ? 'BOOK_NOW'
        : 'SUBMIT_QUOTE_REQUEST',
  };
};

const getRegionPricesByPostcode = async (postcode) => {
  if (!postcode?.trim()) {
    const error = new Error('postcode query parameter is required');
    error.status = 400;
    throw error;
  }

  const region = await resolveRegionByPostcode(postcode);
  const priceMap = await loadRegionPriceMap(region?.id ?? null);
  const prices = {};

  if (priceMap) {
    for (const [tierKey, entry] of Object.entries(priceMap)) {
      prices[tierKey] = entry.amount;
    }
  }

  return {
    postcode: normalizePostcode(postcode).formatted,
    resolvedRegion: region ? { id: region.id, name: region.name } : null,
    hasPricing: Boolean(region && priceMap),
    prices,
  };
};

module.exports = { previewQuote, getRegionPricesByPostcode };
