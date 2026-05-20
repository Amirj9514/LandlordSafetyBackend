const { body, param } = require('express-validator');
const { ALL_ROLES } = require('../constants/roles');

const addressValidator = body('address')
  .optional()
  .isObject()
  .withMessage('Address must be an object');

const createUserValidator = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('role').optional().isIn(ALL_ROLES).withMessage(`Role must be one of: ${ALL_ROLES.join(', ')}`),
  body('phoneNumber').optional().isString(),
  body('secondaryPhoneNumber').optional().isString(),
  addressValidator,
  body('additionalData').optional().isObject(),
  body('isActive').optional().isBoolean(),
];

const updateUserValidator = [
  param('id').isUUID().withMessage('Valid user id is required'),
  body('email').optional().isEmail(),
  body('password').optional().isLength({ min: 8 }),
  body('fullName').optional().trim().notEmpty(),
  body('role').optional().isIn(ALL_ROLES),
  body('phoneNumber').optional().isString(),
  body('secondaryPhoneNumber').optional().isString(),
  addressValidator,
  body('additionalData').optional().isObject(),
  body('isActive').optional().isBoolean(),
];

const userIdValidator = [param('id').isUUID().withMessage('Valid user id is required')];

module.exports = { createUserValidator, updateUserValidator, userIdValidator };
