const { Op } = require('sequelize');
const {
  sequelize,
  ServiceCategory,
  Service,
  ServiceQuestion,
  PricingTier,
  PricingRule,
  Bundle,
  CatalogTopQuestion,
  Region,
  RegionPrice,
  BookingLineItem,
  QuotationLineItem,
} = require('../../models');
const { PROPERTY_TYPES, ALL_PROPERTY_TYPES, PRICING_MODES } = require('../../constants/propertyTypes');
const { RULE_SCOPES } = require('../../constants/pricingRuleTypes');
const { validateRuleConfig, validateRuleScope } = require('../pricing/ruleTypes');
const { buildCatalogPayload } = require('../catalogSerializer');

const throwHttp = (message, status) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

const assertPropertyType = (propertyType) => {
  if (!ALL_PROPERTY_TYPES.includes(propertyType)) {
    throwHttp('Invalid propertyType', 400);
  }
};

const loadCatalogTree = async (propertyType, { activeOnly = false } = {}) => {
  assertPropertyType(propertyType);

  const serviceWhere = { parentServiceId: null };
  if (activeOnly) serviceWhere.isActive = true;

  const childWhere = activeOnly ? { isActive: true } : {};

  const categories = await ServiceCategory.findAll({
    where: { propertyType },
    order: [['displayOrder', 'ASC']],
    include: [
      {
        model: Service,
        as: 'services',
        where: serviceWhere,
        required: false,
        include: [
          {
            model: Service,
            as: 'children',
            where: childWhere,
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
        order: [['displayOrder', 'ASC']],
      },
    ],
  });

  const bundles = await Bundle.findAll({
    where: { propertyType },
    order: [['displayOrder', 'ASC']],
  });

  const topQuestions = await CatalogTopQuestion.findAll({
    where: { propertyType },
    order: [['sortOrder', 'ASC']],
  });

  return buildCatalogPayload({
    propertyType,
    categories,
    bundles,
    topQuestions,
    includeAdminFields: !activeOnly,
  });
};

const getCatalogTree = async (propertyType) => loadCatalogTree(propertyType, { activeOnly: false });

const listCategories = async (propertyType) => {
  const where = {};
  if (propertyType) {
    assertPropertyType(propertyType);
    where.propertyType = propertyType;
  }
  return ServiceCategory.findAll({ where, order: [['displayOrder', 'ASC']] });
};

const createCategory = async (payload) => {
  assertPropertyType(payload.propertyType);
  return ServiceCategory.create(payload);
};

const updateCategory = async (id, payload) => {
  const row = await ServiceCategory.findByPk(id);
  if (!row) throwHttp('Category not found', 404);
  await row.update(payload);
  return row;
};

const deleteCategory = async (id) => {
  const row = await ServiceCategory.findByPk(id);
  if (!row) throwHttp('Category not found', 404);
  const count = await Service.count({ where: { categoryId: id } });
  if (count > 0) throwHttp('Cannot delete category with services', 409);
  await row.destroy();
  return { deleted: true };
};

const reorderCategories = async (items = []) => {
  const transaction = await sequelize.transaction();
  try {
    for (const item of items) {
      await ServiceCategory.update(
        { displayOrder: item.displayOrder },
        { where: { id: item.id }, transaction }
      );
    }
    await transaction.commit();
    return { updated: items.length };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const listServices = async ({ propertyType, categoryId } = {}) => {
  const where = {};
  if (propertyType) {
    assertPropertyType(propertyType);
    where.propertyType = propertyType;
  }
  if (categoryId) where.categoryId = categoryId;
  return Service.findAll({
    where,
    order: [['displayOrder', 'ASC']],
    include: [{ model: ServiceCategory, as: 'category', attributes: ['id', 'code', 'name'] }],
  });
};

const getServiceById = async (id) => {
  const row = await Service.findByPk(id, {
    include: [
      { model: ServiceCategory, as: 'category' },
      { model: ServiceQuestion, as: 'questions', separate: true, order: [['sortOrder', 'ASC']] },
      {
        model: Service,
        as: 'children',
        separate: true,
        include: [{ model: ServiceQuestion, as: 'questions', separate: true, order: [['sortOrder', 'ASC']] }],
      },
      { model: PricingTier, as: 'pricingTiers' },
      { model: PricingRule, as: 'pricingRules', separate: true, order: [['sortOrder', 'ASC']] },
    ],
  });
  if (!row) throwHttp('Service not found', 404);
  return row;
};

const createService = async (payload) => {
  assertPropertyType(payload.propertyType);
  if (!Object.values(PRICING_MODES).includes(payload.pricingMode)) {
    throwHttp('Invalid pricingMode', 400);
  }
  const category = await ServiceCategory.findByPk(payload.categoryId);
  if (!category) throwHttp('Category not found', 404);
  if (category.propertyType !== payload.propertyType) {
    throwHttp('Service propertyType must match category', 400);
  }
  if (payload.parentServiceId) {
    const parent = await Service.findByPk(payload.parentServiceId);
    if (!parent) throwHttp('Parent service not found', 404);
    if (parent.propertyType !== payload.propertyType) {
      throwHttp('Parent service propertyType mismatch', 400);
    }
  }
  return Service.create(payload);
};

const updateService = async (id, payload) => {
  const row = await getServiceById(id);
  if (payload.parentServiceId === id) throwHttp('Service cannot be its own parent', 400);
  if (payload.categoryId) {
    const category = await ServiceCategory.findByPk(payload.categoryId);
    if (!category) throwHttp('Category not found', 404);
  }
  await row.update(payload);
  return getServiceById(id);
};

const setServiceActive = async (id, isActive) => {
  const row = await Service.findByPk(id);
  if (!row) throwHttp('Service not found', 404);
  await row.update({ isActive });
  return row;
};

const deleteService = async (id) => {
  const row = await Service.findByPk(id);
  if (!row) throwHttp('Service not found', 404);

  const [bookingRefs, quotationRefs] = await Promise.all([
    BookingLineItem.count({ where: { serviceCode: row.code } }),
    QuotationLineItem.count({ where: { serviceCode: row.code } }),
  ]);
  if (bookingRefs || quotationRefs) {
    throwHttp('Cannot delete service referenced by bookings or quotations; deactivate instead', 409);
  }

  await ServiceQuestion.destroy({ where: { serviceId: id } });
  await PricingRule.destroy({ where: { serviceId: id } });
  await PricingTier.update({ serviceId: null }, { where: { serviceId: id } });
  await Service.destroy({ where: { parentServiceId: id } });
  await row.destroy();
  return { deleted: true };
};

const listQuestions = async (serviceId) => {
  await getServiceById(serviceId);
  return ServiceQuestion.findAll({
    where: { serviceId },
    order: [['sortOrder', 'ASC']],
  });
};

const createQuestion = async (serviceId, payload) => {
  await getServiceById(serviceId);
  return ServiceQuestion.create({ ...payload, serviceId });
};

const updateQuestion = async (serviceId, questionId, payload) => {
  const row = await ServiceQuestion.findOne({ where: { id: questionId, serviceId } });
  if (!row) throwHttp('Question not found', 404);
  await row.update(payload);
  return row;
};

const deleteQuestion = async (serviceId, questionId) => {
  const row = await ServiceQuestion.findOne({ where: { id: questionId, serviceId } });
  if (!row) throwHttp('Question not found', 404);
  await row.destroy();
  return { deleted: true };
};

const reorderQuestions = async (serviceId, items = []) => {
  await getServiceById(serviceId);
  const transaction = await sequelize.transaction();
  try {
    for (const item of items) {
      await ServiceQuestion.update(
        { sortOrder: item.sortOrder },
        { where: { id: item.id, serviceId }, transaction }
      );
    }
    await transaction.commit();
    return { updated: items.length };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const resolveServiceFieldsForTier = async (serviceId) => {
  if (!serviceId) {
    return { serviceCode: null, serviceName: null };
  }
  const svc = await Service.findByPk(serviceId, {
    attributes: ['id', 'code', 'name', 'propertyType'],
  });
  if (!svc) {
    return { serviceCode: null, serviceName: null };
  }
  return { serviceCode: svc.code, serviceName: svc.name, propertyType: svc.propertyType };
};

const serializePricingTier = (tier) => {
  const plain = tier.get ? tier.get({ plain: true }) : tier;
  const svc = plain.service;
  const serviceCode = plain.serviceCode ?? svc?.code ?? null;
  const serviceName = plain.serviceName ?? svc?.name ?? null;
  const propertyType = svc?.propertyType ?? null;

  return {
    id: plain.id,
    tierKey: plain.tierKey,
    label: plain.label,
    serviceId: plain.serviceId ?? null,
    serviceCode,
    serviceName,
    sortOrder: plain.sortOrder,
    isTbcByDefault: plain.isTbcByDefault,
    metadata: plain.metadata ?? {},
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    propertyType,
    service:
      serviceCode || serviceName
        ? {
            id: svc?.id ?? plain.serviceId ?? null,
            code: serviceCode,
            name: serviceName,
            propertyType,
          }
        : null,
  };
};

const syncTierServiceFields = async (tier, transaction = null) => {
  if (!tier?.serviceId) {
    await tier.update({ serviceCode: null, serviceName: null }, { transaction });
    return tier;
  }
  const fields = await resolveServiceFieldsForTier(tier.serviceId);
  await tier.update(
    { serviceCode: fields.serviceCode, serviceName: fields.serviceName },
    { transaction }
  );
  return tier;
};

const pricingTierInclude = {
  model: Service,
  as: 'service',
  attributes: ['id', 'code', 'name', 'propertyType'],
  required: false,
};

const bootstrapRegionPricesForTier = async (pricingTierId, transaction) => {
  const regions = await Region.findAll({ attributes: ['id'] });
  for (const region of regions) {
    await RegionPrice.findOrCreate({
      where: { regionId: region.id, pricingTierId },
      defaults: { regionId: region.id, pricingTierId, amount: null },
      transaction,
    });
  }
};

const listPricingTiers = async ({ serviceId, serviceCode, propertyType } = {}) => {
  const where = {};
  if (serviceId) where.serviceId = serviceId;
  if (serviceCode) {
    const svc = await Service.findOne({ where: { code: serviceCode } });
    if (!svc) throwHttp('Service not found', 404);
    where.serviceId = svc.id;
  }
  if (propertyType && !serviceId && !serviceCode) {
    assertPropertyType(propertyType);
    const services = await Service.findAll({ where: { propertyType }, attributes: ['id'] });
    const serviceIds = services.map((s) => s.id);
    where[Op.or] = [{ serviceId: { [Op.in]: serviceIds } }, { serviceId: null }];
  }

  const rows = await PricingTier.findAll({
    where,
    include: [pricingTierInclude],
    order: [['sortOrder', 'ASC'], ['tierKey', 'ASC']],
  });

  for (const tier of rows) {
    if (tier.serviceId && (!tier.serviceCode || !tier.serviceName)) {
      await syncTierServiceFields(tier);
    }
  }

  return rows.map(serializePricingTier);
};

const createPricingTier = async (payload) => {
  const transaction = await sequelize.transaction();
  try {
    const serviceFields = payload.serviceId
      ? await resolveServiceFieldsForTier(payload.serviceId)
      : { serviceCode: null, serviceName: null };
    if (payload.serviceId && !serviceFields.serviceCode) {
      throwHttp('Service not found', 404);
    }
    const row = await PricingTier.create(
      { ...payload, serviceCode: serviceFields.serviceCode, serviceName: serviceFields.serviceName },
      { transaction }
    );
    await bootstrapRegionPricesForTier(row.id, transaction);
    await transaction.commit();
    return serializePricingTier(
      await PricingTier.findByPk(row.id, { include: [pricingTierInclude] })
    );
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const updatePricingTier = async (id, payload) => {
  const row = await PricingTier.findByPk(id);
  if (!row) throwHttp('Pricing tier not found', 404);

  const nextServiceId =
    payload.serviceId !== undefined ? payload.serviceId : row.serviceId;
  const serviceFields =
    nextServiceId === null || nextServiceId === undefined
      ? { serviceCode: null, serviceName: null }
      : await resolveServiceFieldsForTier(nextServiceId);
  if (nextServiceId && !serviceFields.serviceCode) {
    throwHttp('Service not found', 404);
  }

  await row.update({
    ...payload,
    serviceCode: serviceFields.serviceCode,
    serviceName: serviceFields.serviceName,
  });
  return serializePricingTier(
    await PricingTier.findByPk(id, { include: [pricingTierInclude] })
  );
};

const deletePricingTier = async (id) => {
  const row = await PricingTier.findByPk(id);
  if (!row) throwHttp('Pricing tier not found', 404);

  const regionPriceCount = await RegionPrice.count({ where: { pricingTierId: id } });
  if (regionPriceCount > 0) {
    throwHttp('Cannot delete tier with region prices; clear prices first', 409);
  }

  const bundleRef = await Bundle.count({ where: { discountTierKey: row.tierKey } });
  if (bundleRef) throwHttp('Cannot delete tier referenced by a bundle', 409);

  await row.destroy();
  return { deleted: true };
};

const listBundles = async (propertyType) => {
  const where = {};
  if (propertyType) {
    assertPropertyType(propertyType);
    where.propertyType = propertyType;
  }
  return Bundle.findAll({ where, order: [['displayOrder', 'ASC']] });
};

const createBundle = async (payload) => {
  assertPropertyType(payload.propertyType);
  return Bundle.create(payload);
};

const updateBundle = async (id, payload) => {
  const row = await Bundle.findByPk(id);
  if (!row) throwHttp('Bundle not found', 404);
  await row.update(payload);
  return row;
};

const deleteBundle = async (id) => {
  const row = await Bundle.findByPk(id);
  if (!row) throwHttp('Bundle not found', 404);
  await PricingRule.destroy({ where: { bundleId: id } });
  await row.destroy();
  return { deleted: true };
};

const validatePricingRulePayload = (payload, existing = null) => {
  const ruleType = payload.ruleType ?? existing?.ruleType;
  const config = payload.config ?? existing?.config ?? {};
  const scope = payload.scope ?? existing?.scope ?? RULE_SCOPES.SERVICE_LINE;

  const configErr = validateRuleConfig(ruleType, config);
  if (configErr) throwHttp(configErr, 400);
  const scopeErr = validateRuleScope(scope, ruleType);
  if (scopeErr) throwHttp(scopeErr, 400);
};

const listPricingRules = async ({ serviceId, propertyType } = {}) => {
  const where = {};
  if (serviceId) where.serviceId = serviceId;

  if (propertyType) {
    assertPropertyType(propertyType);
    const services = await Service.findAll({ where: { propertyType }, attributes: ['id'] });
    const serviceIds = services.map((s) => s.id);
    where[Op.or] = [
      { serviceId: { [Op.in]: serviceIds } },
      { scope: RULE_SCOPES.BOOKING_SURCHARGE },
      { scope: RULE_SCOPES.BUNDLE_DISCOUNT },
    ];
  }

  return PricingRule.findAll({
    where,
    order: [['sortOrder', 'ASC'], ['ruleKey', 'ASC']],
    include: [
      { model: Service, as: 'service', attributes: ['id', 'code', 'name'] },
      { model: Bundle, as: 'bundle', attributes: ['id', 'bundleKey', 'label'] },
    ],
  });
};

const createPricingRule = async (payload) => {
  validatePricingRulePayload(payload);
  if (payload.serviceId) {
    const svc = await Service.findByPk(payload.serviceId);
    if (!svc) throwHttp('Service not found', 404);
  }
  if (payload.bundleId) {
    const bundle = await Bundle.findByPk(payload.bundleId);
    if (!bundle) throwHttp('Bundle not found', 404);
  }
  return PricingRule.create(payload);
};

const updatePricingRule = async (id, payload) => {
  const row = await PricingRule.findByPk(id);
  if (!row) throwHttp('Pricing rule not found', 404);
  validatePricingRulePayload(payload, row);
  await row.update(payload);
  return row;
};

const deletePricingRule = async (id) => {
  const row = await PricingRule.findByPk(id);
  if (!row) throwHttp('Pricing rule not found', 404);
  await row.destroy();
  return { deleted: true };
};

const listTopQuestions = async (propertyType) => {
  const where = {};
  if (propertyType) {
    assertPropertyType(propertyType);
    where.propertyType = propertyType;
  }
  return CatalogTopQuestion.findAll({ where, order: [['sortOrder', 'ASC']] });
};

const createTopQuestion = async (payload) => {
  assertPropertyType(payload.propertyType);
  return CatalogTopQuestion.create(payload);
};

const updateTopQuestion = async (id, payload) => {
  const row = await CatalogTopQuestion.findByPk(id);
  if (!row) throwHttp('Top question not found', 404);
  await row.update(payload);
  return row;
};

const deleteTopQuestion = async (id) => {
  const row = await CatalogTopQuestion.findByPk(id);
  if (!row) throwHttp('Top question not found', 404);
  await row.destroy();
  return { deleted: true };
};

module.exports = {
  loadCatalogTree,
  getCatalogTree,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  listServices,
  getServiceById,
  createService,
  updateService,
  setServiceActive,
  deleteService,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  listPricingTiers,
  createPricingTier,
  updatePricingTier,
  deletePricingTier,
  listBundles,
  createBundle,
  updateBundle,
  deleteBundle,
  listPricingRules,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  listTopQuestions,
  createTopQuestion,
  updateTopQuestion,
  deleteTopQuestion,
  bootstrapRegionPricesForTier,
};
