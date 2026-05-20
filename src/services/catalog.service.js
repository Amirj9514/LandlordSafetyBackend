const {
  ServiceCategory,
  Service,
  ServiceQuestion,
  Bundle,
} = require('../models');
const { PROPERTY_TYPES } = require('../constants/propertyTypes');
const { resolveRegionByPostcode, normalizePostcode } = require('./pricing/regionResolver');
const { loadRegionPriceMap } = require('./pricing/priceLookup');
const { enrichCatalogWithPrices } = require('./catalogOptionPricing');

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

  const categories = await ServiceCategory.findAll({
    where: { propertyType },
    order: [['displayOrder', 'ASC']],
    include: [
      {
        model: Service,
        as: 'services',
        where: { isActive: true, parentServiceId: null },
        required: false,
        order: [['displayOrder', 'ASC']],
        include: [
          {
            model: Service,
            as: 'children',
            where: { isActive: true },
            required: false,
            separate: true,
            order: [['displayOrder', 'ASC']],
            include: [
              {
                model: ServiceQuestion,
                as: 'questions',
                separate: true,
                order: [['sortOrder', 'ASC']],
              },
            ],
          },
          {
            model: ServiceQuestion,
            as: 'questions',
            separate: true,
            order: [['sortOrder', 'ASC']],
          },
        ],
      },
    ],
  });

  const bundles = await Bundle.findAll({
    where: { propertyType },
    order: [['displayOrder', 'ASC']],
  });

  const serializeService = (svc) => ({
    id: svc.id,
    code: svc.code,
    name: svc.name,
    pricingMode: svc.pricingMode,
    displayOrder: svc.displayOrder,
    metadata: svc.metadata,
    questions: (svc.questions || []).map((q) => ({
      id: q.id,
      fieldKey: q.fieldKey,
      inputType: q.inputType,
      label: q.label,
      options: q.options,
      validation: q.validation,
      conditionalLogic: q.conditionalLogic,
      sortOrder: q.sortOrder,
      section: q.section,
    })),
    children: (svc.children || []).map(serializeService),
  });

  const catalog = {
    propertyType,
    categories: categories.map((cat) => ({
      id: cat.id,
      code: cat.code,
      name: cat.name,
      displayOrder: cat.displayOrder,
      services: (cat.services || []).map(serializeService),
    })),
    bundles: bundles.map((b) => ({
      id: b.id,
      bundleKey: b.bundleKey,
      label: b.label,
      serviceCodes: b.serviceCodes,
      discountAmount: b.discountAmount,
      discountTierKey: b.discountTierKey,
      exclusionGroup: b.exclusionGroup,
      metadata: b.metadata,
    })),
    commercialTopQuestions:
      propertyType === PROPERTY_TYPES.COMMERCIAL
        ? [
            {
              fieldKey: 'commercialPropertyType',
              inputType: 'radio',
              label: 'Property Type',
              options: [
                { value: 'catering_hospitality', label: 'Catering & Hospitality' },
                { value: 'institutional_commercial', label: 'Institutional & Commercial' },
              ],
              validation: { required: true },
            },
          ]
        : [],
  };

  if (!postcode?.trim()) {
    return catalog;
  }

  const region = await resolveRegionByPostcode(postcode);
  const priceMap = await loadRegionPriceMap(region?.id ?? null);
  const { formatted } = normalizePostcode(postcode);

  return enrichCatalogWithPrices(catalog, priceMap, region, formatted);
};

module.exports = { getCatalog };
