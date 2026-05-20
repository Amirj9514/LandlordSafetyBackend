const express = require('express');
const {
  getMe,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireMinRole } = require('../middleware/role.middleware');
const { ROLES } = require('../constants/roles');
const {
  createUserValidator,
  updateUserValidator,
  userIdValidator,
} = require('../validators/user.validator');
const validate = require('../middleware/validate.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/me', getMe);

router.get('/', requireMinRole(ROLES.ADMIN), listUsers);
router.get('/:id', requireMinRole(ROLES.ADMIN), userIdValidator, validate, getUserById);
router.post('/', requireMinRole(ROLES.ADMIN), createUserValidator, validate, createUser);
router.put('/:id', requireMinRole(ROLES.ADMIN), updateUserValidator, validate, updateUser);
router.delete('/:id', requireMinRole(ROLES.SUPER_ADMIN), userIdValidator, validate, deleteUser);

module.exports = router;
