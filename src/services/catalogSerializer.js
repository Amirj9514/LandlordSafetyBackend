const serializeQuestion = (q) => ({
  id: q.id,
  fieldKey: q.fieldKey,
  inputType: q.inputType,
  label: q.label,
  options: q.options,
  validation: q.validation,
  conditionalLogic: q.conditionalLogic,
  sortOrder: q.sortOrder,
  section: q.section,
});

const serializeService = (svc, { includeAdminFields = false } = {}) => {
  const base = {
    id: svc.id,
    code: svc.code,
    name: svc.name,
    pricingMode: svc.pricingMode,
    displayOrder: svc.displayOrder,
    metadata: svc.metadata,
    questions: (svc.questions || []).map(serializeQuestion),
    children: (svc.children || []).map((child) => serializeService(child, { includeAdminFields })),
  };

  if (includeAdminFields) {
    return {
      ...base,
      categoryId: svc.categoryId,
      propertyType: svc.propertyType,
      parentServiceId: svc.parentServiceId,
      isActive: svc.isActive,
    };
  }

  return base;
};

const serializeCategory = (cat, options = {}) => ({
  id: cat.id,
  code: cat.code,
  name: cat.name,
  displayOrder: cat.displayOrder,
  ...(options.includeAdminFields ? { propertyType: cat.propertyType } : {}),
  services: (cat.services || []).map((s) => serializeService(s, options)),
});

const serializeBundle = (b) => ({
  id: b.id,
  bundleKey: b.bundleKey,
  label: b.label,
  serviceCodes: b.serviceCodes,
  discountAmount: b.discountAmount,
  discountTierKey: b.discountTierKey,
  exclusionGroup: b.exclusionGroup,
  displayOrder: b.displayOrder,
  metadata: b.metadata,
  propertyType: b.propertyType,
});

const serializeTopQuestion = (q) => ({
  id: q.id,
  fieldKey: q.fieldKey,
  inputType: q.inputType,
  label: q.label,
  options: q.options,
  validation: q.validation,
  sortOrder: q.sortOrder,
  propertyType: q.propertyType,
});

const buildCatalogPayload = ({
  propertyType,
  categories,
  bundles,
  topQuestions = [],
  includeAdminFields = false,
}) => ({
  propertyType,
  categories: categories.map((c) => serializeCategory(c, { includeAdminFields })),
  bundles: bundles.map(serializeBundle),
  commercialTopQuestions:
    propertyType === 'commercial' ? topQuestions.map(serializeTopQuestion) : [],
});

module.exports = {
  serializeQuestion,
  serializeService,
  serializeCategory,
  serializeBundle,
  serializeTopQuestion,
  buildCatalogPayload,
};
