const express = require('express');
const {
  createQuotation,
  listQuotations,
  getQuotation,
  updateQuotationLines,
  updateQuotationStatus,
  convertQuotation,
} = require('../controllers/quotation.controller');
const {
  createQuotationValidator,
  listQuotationsValidator,
  quotationIdParam,
  updateQuotationLinesValidator,
  updateQuotationStatusValidator,
} = require('../validators/quotation.validator');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { requireMinRole } = require('../middleware/role.middleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.post('/', createQuotationValidator, validate, createQuotation);

router.use(authenticate);
router.use(requireMinRole(ROLES.ADMIN));

router.get('/', listQuotationsValidator, validate, listQuotations);
router.get('/:id', quotationIdParam, validate, getQuotation);
router.put('/:id/lines', updateQuotationLinesValidator, validate, updateQuotationLines);
router.patch('/:id/status', updateQuotationStatusValidator, validate, updateQuotationStatus);
router.post('/:id/convert', quotationIdParam, validate, convertQuotation);

module.exports = router;
