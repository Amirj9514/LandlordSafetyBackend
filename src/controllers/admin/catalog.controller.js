const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const httpStatus = require('../../constants/httpStatus');
const catalogAdminService = require('../../services/admin/catalogAdmin.service');

const getCatalogTree = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.getCatalogTree(req.query.propertyType);
  return sendSuccess(res, { data, message: 'Catalog tree fetched', status: httpStatus.OK });
});

const listCategories = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.listCategories(req.query.propertyType);
  return sendSuccess(res, { data, message: 'Categories fetched', status: httpStatus.OK });
});

const createCategory = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.createCategory(req.body);
  return sendSuccess(res, { data, message: 'Category created', status: httpStatus.CREATED });
});

const updateCategory = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.updateCategory(req.params.id, req.body);
  return sendSuccess(res, { data, message: 'Category updated', status: httpStatus.OK });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.deleteCategory(req.params.id);
  return sendSuccess(res, { data, message: 'Category deleted', status: httpStatus.OK });
});

const reorderCategories = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.reorderCategories(req.body.items);
  return sendSuccess(res, { data, message: 'Categories reordered', status: httpStatus.OK });
});

const listServices = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.listServices(req.query);
  return sendSuccess(res, { data, message: 'Services fetched', status: httpStatus.OK });
});

const getService = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.getServiceById(req.params.id);
  return sendSuccess(res, { data, message: 'Service fetched', status: httpStatus.OK });
});

const createService = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.createService(req.body);
  return sendSuccess(res, { data, message: 'Service created', status: httpStatus.CREATED });
});

const updateService = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.updateService(req.params.id, req.body);
  return sendSuccess(res, { data, message: 'Service updated', status: httpStatus.OK });
});

const setServiceActive = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.setServiceActive(req.params.id, req.body.isActive);
  return sendSuccess(res, { data, message: 'Service active state updated', status: httpStatus.OK });
});

const deleteService = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.deleteService(req.params.id);
  return sendSuccess(res, { data, message: 'Service deleted', status: httpStatus.OK });
});

const listQuestions = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.listQuestions(req.params.serviceId);
  return sendSuccess(res, { data, message: 'Questions fetched', status: httpStatus.OK });
});

const createQuestion = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.createQuestion(req.params.serviceId, req.body);
  return sendSuccess(res, { data, message: 'Question created', status: httpStatus.CREATED });
});

const updateQuestion = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.updateQuestion(
    req.params.serviceId,
    req.params.id,
    req.body
  );
  return sendSuccess(res, { data, message: 'Question updated', status: httpStatus.OK });
});

const deleteQuestion = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.deleteQuestion(req.params.serviceId, req.params.id);
  return sendSuccess(res, { data, message: 'Question deleted', status: httpStatus.OK });
});

const reorderQuestions = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.reorderQuestions(req.params.serviceId, req.body.items);
  return sendSuccess(res, { data, message: 'Questions reordered', status: httpStatus.OK });
});

const listPricingTiers = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.listPricingTiers(req.query);
  return sendSuccess(res, { data, message: 'Pricing tiers fetched', status: httpStatus.OK });
});

const createPricingTier = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.createPricingTier(req.body);
  return sendSuccess(res, { data, message: 'Pricing tier created', status: httpStatus.CREATED });
});

const updatePricingTier = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.updatePricingTier(req.params.id, req.body);
  return sendSuccess(res, { data, message: 'Pricing tier updated', status: httpStatus.OK });
});

const deletePricingTier = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.deletePricingTier(req.params.id);
  return sendSuccess(res, { data, message: 'Pricing tier deleted', status: httpStatus.OK });
});

const listBundles = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.listBundles(req.query.propertyType);
  return sendSuccess(res, { data, message: 'Bundles fetched', status: httpStatus.OK });
});

const createBundle = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.createBundle(req.body);
  return sendSuccess(res, { data, message: 'Bundle created', status: httpStatus.CREATED });
});

const updateBundle = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.updateBundle(req.params.id, req.body);
  return sendSuccess(res, { data, message: 'Bundle updated', status: httpStatus.OK });
});

const deleteBundle = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.deleteBundle(req.params.id);
  return sendSuccess(res, { data, message: 'Bundle deleted', status: httpStatus.OK });
});

const listPricingRules = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.listPricingRules(req.query);
  return sendSuccess(res, { data, message: 'Pricing rules fetched', status: httpStatus.OK });
});

const createPricingRule = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.createPricingRule(req.body);
  return sendSuccess(res, { data, message: 'Pricing rule created', status: httpStatus.CREATED });
});

const updatePricingRule = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.updatePricingRule(req.params.id, req.body);
  return sendSuccess(res, { data, message: 'Pricing rule updated', status: httpStatus.OK });
});

const deletePricingRule = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.deletePricingRule(req.params.id);
  return sendSuccess(res, { data, message: 'Pricing rule deleted', status: httpStatus.OK });
});

const listTopQuestions = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.listTopQuestions(req.query.propertyType);
  return sendSuccess(res, { data, message: 'Top questions fetched', status: httpStatus.OK });
});

const createTopQuestion = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.createTopQuestion(req.body);
  return sendSuccess(res, { data, message: 'Top question created', status: httpStatus.CREATED });
});

const updateTopQuestion = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.updateTopQuestion(req.params.id, req.body);
  return sendSuccess(res, { data, message: 'Top question updated', status: httpStatus.OK });
});

const deleteTopQuestion = asyncHandler(async (req, res) => {
  const data = await catalogAdminService.deleteTopQuestion(req.params.id);
  return sendSuccess(res, { data, message: 'Top question deleted', status: httpStatus.OK });
});

module.exports = {
  getCatalogTree,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  listServices,
  getService,
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
};
