const express = require('express');
const { getHealth } = require('../controllers/health.controller');
const { login } = require('../controllers/auth.controller');
const { loginValidator } = require('../validators/auth.validator');
const validate = require('../middleware/validate.middleware');

const router = express.Router();

router.get('/health', getHealth);
router.post('/auth/login', loginValidator, validate, login);

module.exports = router;
