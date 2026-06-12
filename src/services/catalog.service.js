const { CatalogTopQuestion } = require('../models');
const { PROPERTY_TYPES } = require('../constants/propertyTypes');
const { resolveRegionByPostcode, normalizePostcode } = require('./pricing/regionResolver');
const { loadRegionPriceMap } = require('./pricing/priceLookup');
const { enrichCatalogWithPrices } = require('./catalogOptionPricing');
const { loadCatalogTree } = require('./admin/catalogAdmin.service');

const getCatalog = async (propertyType, postcode) => {
  if (!propertyType) {
    const error = new Error('propertyType query parameter is required');
    error.status = 400;
    throw error;
  }

  if (!Object.values(PROPERTY_TYPES).includes(propertyType)) {
    const error = new Error('Invalid propertyType');
    error.status = 400;
    throw error;
  }

  const catalog = await loadCatalogTree(propertyType, { activeOnly: true });

  const topQuestions = await CatalogTopQuestion.findAll({
    where: { propertyType },
    order: [['sortOrder', 'ASC']],
  });
  catalog.commercialTopQuestions =
    propertyType === PROPERTY_TYPES.COMMERCIAL
      ? topQuestions.map((q) => ({
          fieldKey: q.fieldKey,
          inputType: q.inputType,
          label: q.label,
          options: q.options,
          validation: q.validation,
        }))
      : [];

  if (!postcode?.trim()) {
    return catalog;
  }

  const region = await resolveRegionByPostcode(postcode);
  const priceMap = await loadRegionPriceMap(region?.id ?? null);
  const { formatted } = normalizePostcode(postcode);

  return enrichCatalogWithPrices(catalog, priceMap, region, formatted);
};

module.exports = { getCatalog };
