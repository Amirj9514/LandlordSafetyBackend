const express = require('express');
const { getCatalog } = require('../controllers/catalog.controller');
const { catalogQueryValidator } = require('../validators/catalog.validator');
const validate = require('../middleware/validate.middleware');

const router = express.Router();

router.get('/', catalogQueryValidator, validate, getCatalog);

module.exports = router;
