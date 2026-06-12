const express = require('express');
const catalogController = require('../../controllers/admin/catalog.controller');
const {
  treeQuery,
  propertyTypeQuery,
  createCategoryValidator,
  updateCategoryValidator,
  reorderCategoriesValidator,
  createServiceValidator,
  updateServiceValidator,
  setServiceActiveValidator,
  serviceIdParam,
  createQuestionValidator,
  updateQuestionValidator,
  reorderQuestionsValidator,
  createPricingTierValidator,
  updatePricingTierValidator,
  createBundleValidator,
  updateBundleValidator,
  createPricingRuleValidator,
  updatePricingRuleValidator,
  createTopQuestionValidator,
  updateTopQuestionValidator,
} = require('../../validators/admin/catalog.validator');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireMinRole } = require('../../middleware/role.middleware');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.use(authenticate);
router.use(requireMinRole(ROLES.ADMIN));

router.get('/tree', treeQuery, validate, catalogController.getCatalogTree);

router.get('/categories', propertyTypeQuery, validate, catalogController.listCategories);
router.post('/categories', createCategoryValidator, validate, catalogController.createCategory);
router.patch('/categories/reorder', reorderCategoriesValidator, validate, catalogController.reorderCategories);
router.put('/categories/:id', updateCategoryValidator, validate, catalogController.updateCategory);
router.delete('/categories/:id', catalogController.deleteCategory);

router.get('/services', propertyTypeQuery, validate, catalogController.listServices);
router.post('/services', createServiceValidator, validate, catalogController.createService);
router.get('/services/:id', catalogController.getService);
router.put('/services/:id', updateServiceValidator, validate, catalogController.updateService);
router.patch('/services/:id/active', setServiceActiveValidator, validate, catalogController.setServiceActive);
router.delete('/services/:id', catalogController.deleteService);

router.get('/services/:serviceId/questions', serviceIdParam, validate, catalogController.listQuestions);
router.post('/services/:serviceId/questions', createQuestionValidator, validate, catalogController.createQuestion);
router.patch(
  '/services/:serviceId/questions/reorder',
  reorderQuestionsValidator,
  validate,
  catalogController.reorderQuestions
);
router.put(
  '/services/:serviceId/questions/:id',
  updateQuestionValidator,
  validate,
  catalogController.updateQuestion
);
router.delete(
  '/services/:serviceId/questions/:id',
  serviceIdParam,
  validate,
  catalogController.deleteQuestion
);

router.get('/pricing-tiers', propertyTypeQuery, validate, catalogController.listPricingTiers);
router.post('/pricing-tiers', createPricingTierValidator, validate, catalogController.createPricingTier);
router.put('/pricing-tiers/:id', updatePricingTierValidator, validate, catalogController.updatePricingTier);
router.delete('/pricing-tiers/:id', catalogController.deletePricingTier);

router.get('/bundles', propertyTypeQuery, validate, catalogController.listBundles);
router.post('/bundles', createBundleValidator, validate, catalogController.createBundle);
router.put('/bundles/:id', updateBundleValidator, validate, catalogController.updateBundle);
router.delete('/bundles/:id', catalogController.deleteBundle);

router.get('/pricing-rules', propertyTypeQuery, validate, catalogController.listPricingRules);
router.post('/pricing-rules', createPricingRuleValidator, validate, catalogController.createPricingRule);
router.put('/pricing-rules/:id', updatePricingRuleValidator, validate, catalogController.updatePricingRule);
router.delete('/pricing-rules/:id', catalogController.deletePricingRule);

router.get('/top-questions', propertyTypeQuery, validate, catalogController.listTopQuestions);
router.post('/top-questions', createTopQuestionValidator, validate, catalogController.createTopQuestion);
router.put('/top-questions/:id', updateTopQuestionValidator, validate, catalogController.updateTopQuestion);
router.delete('/top-questions/:id', catalogController.deleteTopQuestion);

module.exports = router;
