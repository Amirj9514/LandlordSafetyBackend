require('dotenv').config();
const {
  sequelize,
  ServiceCategory,
  Service,
  ServiceQuestion,
  PricingTier,
  Bundle,
  CatalogTopQuestion,
  syncModels,
} = require('../models');
const catalogData = require('./seed/catalogData');

const upsertCategory = async (cat) => {
  const [row] = await ServiceCategory.findOrCreate({
    where: { code: cat.code },
    defaults: cat,
  });
  if (row.name !== cat.name || row.displayOrder !== cat.displayOrder) {
    await row.update(cat);
  }
  return row;
};

const upsertService = async (svc, categoryId, parentId = null) => {
  const payload = {
    categoryId,
    code: svc.code,
    name: svc.name,
    propertyType: svc.propertyType,
    pricingMode: svc.pricingMode,
    displayOrder: svc.displayOrder,
    parentServiceId: parentId,
    metadata: svc.metadata || {},
    isActive: true,
  };
  const [row] = await Service.findOrCreate({
    where: { code: svc.code },
    defaults: payload,
  });
  await row.update(payload);
  return row;
};

const seedQuestions = async (serviceId, questions) => {
  if (!questions?.length) return;
  for (const q of questions) {
    const existing = await ServiceQuestion.findOne({
      where: { serviceId, fieldKey: q.fieldKey },
    });
    const payload = {
      serviceId,
      fieldKey: q.fieldKey,
      inputType: q.inputType,
      label: q.label,
      options: q.options ?? null,
      validation: q.validation ?? null,
      conditionalLogic: q.conditionalLogic ?? null,
      sortOrder: q.sortOrder ?? 0,
      section: q.section ?? null,
    };
    if (existing) await existing.update(payload);
    else await ServiceQuestion.create(payload);
  }
};

const seedTiers = async (serviceByCode) => {
  for (const tier of catalogData.pricingTiers) {
    const linked = tier.serviceCode ? serviceByCode[tier.serviceCode] : null;
    const serviceId = linked?.id ?? null;
    const serviceCode = linked?.code ?? null;
    const serviceName = linked?.name ?? null;
    const [row] = await PricingTier.findOrCreate({
      where: { tierKey: tier.tierKey },
      defaults: {
        tierKey: tier.tierKey,
        label: tier.label,
        serviceId,
        serviceCode,
        serviceName,
        sortOrder: tier.sortOrder ?? 0,
        isTbcByDefault: tier.isTbcByDefault ?? false,
        metadata: tier.metadata ?? {},
      },
    });
    await row.update({
      label: tier.label,
      serviceId,
      serviceCode,
      serviceName,
      sortOrder: tier.sortOrder ?? 0,
      isTbcByDefault: tier.isTbcByDefault ?? false,
    });
  }
};

const seedBundles = async () => {
  for (const b of catalogData.residentialBundles) {
    const [row] = await Bundle.findOrCreate({
      where: { bundleKey: b.bundleKey },
      defaults: b,
    });
    await row.update(b);
  }
};

const seedTopQuestions = async () => {
  const { PROPERTY_TYPES } = require('../constants/propertyTypes');
  const commercialTop = {
    propertyType: PROPERTY_TYPES.COMMERCIAL,
    fieldKey: 'commercialPropertyType',
    inputType: 'radio',
    label: 'Property Type',
    options: [
      { value: 'catering_hospitality', label: 'Catering & Hospitality' },
      { value: 'institutional_commercial', label: 'Institutional & Commercial' },
    ],
    validation: { required: true },
    sortOrder: 1,
  };
  const existing = await CatalogTopQuestion.findOne({
    where: { propertyType: commercialTop.propertyType, fieldKey: commercialTop.fieldKey },
  });
  if (existing) await existing.update(commercialTop);
  else await CatalogTopQuestion.create(commercialTop);
};

const run = async () => {
  await syncModels({ alter: true });

  const categoryByCode = {};
  for (const cat of catalogData.categories) {
    categoryByCode[cat.code] = await upsertCategory(cat);
  }

  const serviceByCode = {};
  const pendingChildren = [];

  for (const svc of catalogData.services) {
    const category = categoryByCode[svc.categoryCode];
    if (!category) throw new Error(`Missing category: ${svc.categoryCode}`);
    if (svc.parentCode) {
      pendingChildren.push(svc);
      continue;
    }
    const row = await upsertService(svc, category.id, null);
    serviceByCode[svc.code] = row;
    await seedQuestions(row.id, svc.questions);
  }

  for (const svc of pendingChildren) {
    const category = categoryByCode[svc.categoryCode];
    const parent = serviceByCode[svc.parentCode];
    const row = await upsertService(svc, category.id, parent?.id ?? null);
    serviceByCode[svc.code] = row;
    await seedQuestions(row.id, svc.questions);
  }

  await seedTiers(serviceByCode);
  await seedBundles();
  await seedTopQuestions();

  console.log('Catalog seed complete:', {
    categories: catalogData.categories.length,
    services: catalogData.services.length,
    tiers: catalogData.pricingTiers.length,
    bundles: catalogData.residentialBundles.length,
  });
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => sequelize.close());
