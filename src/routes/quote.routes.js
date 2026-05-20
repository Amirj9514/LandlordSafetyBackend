const express = require('express');
const { previewQuote, getRegionPrices } = require('../controllers/quote.controller');
const { quotePreviewValidator, regionPricesQueryValidator } = require('../validators/quote.validator');
const validate = require('../middleware/validate.middleware');

const router = express.Router();

router.get('/region-prices', regionPricesQueryValidator, validate, getRegionPrices);
router.post('/preview', quotePreviewValidator, validate, previewQuote);

module.exports = router;
