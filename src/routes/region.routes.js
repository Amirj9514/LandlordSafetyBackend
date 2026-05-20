const express = require('express');
const {
  listRegions,
  getRegion,
  createRegion,
  updateRegion,
  deleteRegion,
  replacePrefixes,
  getRegionPrices,
  upsertRegionPrices,
} = require('../controllers/region.controller');
const {
  regionIdParam,
  createRegionValidator,
  updateRegionValidator,
  replacePrefixesValidator,
  upsertPricesValidator,
} = require('../validators/region.validator');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { requireMinRole } = require('../middleware/role.middleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(authenticate);
router.use(requireMinRole(ROLES.ADMIN));

router.get('/', listRegions);
router.post('/', createRegionValidator, validate, createRegion);
router.get('/:id', regionIdParam, validate, getRegion);
router.put('/:id', updateRegionValidator, validate, updateRegion);
router.delete('/:id', regionIdParam, validate, deleteRegion);
router.put('/:id/prefixes', replacePrefixesValidator, validate, replacePrefixes);
router.get('/:id/prices', regionIdParam, validate, getRegionPrices);
router.put('/:id/prices', upsertPricesValidator, validate, upsertRegionPrices);

module.exports = router;
