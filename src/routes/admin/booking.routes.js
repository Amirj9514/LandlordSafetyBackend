const express = require('express');
const { adminCreateBooking } = require('../../controllers/admin/booking.controller');
const { adminCreateBookingValidator } = require('../../validators/booking.validator');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireMinRole } = require('../../middleware/role.middleware');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.use(authenticate);
router.use(requireMinRole(ROLES.ADMIN));

router.post('/', adminCreateBookingValidator, validate, adminCreateBooking);

module.exports = router;
