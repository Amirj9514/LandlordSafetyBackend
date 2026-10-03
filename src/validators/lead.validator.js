const { body, query, param } = require('express-validator');
const { ALL_PROPERTY_TYPES } = require('../constants/propertyTypes');
const { ALL_LEAD_STATUSES } = require('../constants/leadStatus');
const { isValidContact } = require('../utils/contactParser');

const createLeadValidator = [
  body('postcode').trim().notEmpty().withMessage('Postcode is required'),
  body('propertyType').isIn(ALL_PROPERTY_TYPES).withMessage('Invalid property type'),
  body('contact')
    .trim()
    .notEmpty()
    .withMessage('Email or phone is required')
    .custom((value) => {
      if (!isValidContact(value)) {
        throw new Error('Contact must be a valid email address or phone number');
      }
      return true;
    }),
];

const createEnquiryValidator = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 150 })
    .withMessage('Full name is too long'),
  body('email').trim().isEmail().withMessage('A valid email address is required'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[\d\s+().-]{7,20}$/)
    .withMessage('Phone must be a valid phone number'),
  body('message')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Message must be 2000 characters or fewer'),
  body('service')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Service is too long'),
  body('propertyType')
    .optional({ values: 'falsy' })
    .isIn(ALL_PROPERTY_TYPES)
    .withMessage('Invalid property type'),
];

const listLeadsValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('propertyType').optional().isIn(ALL_PROPERTY_TYPES),
  query('status').optional().isIn(ALL_LEAD_STATUSES),
  query('search').optional().trim().isLength({ min: 1, max: 100 }),
];

const leadIdParam = [param('id').isUUID().withMessage('Invalid lead id')];

const updateLeadStatusValidator = [
  ...leadIdParam,
  body('status').isIn(ALL_LEAD_STATUSES).withMessage('Invalid lead status'),
];

const addLeadNoteValidator = [
  ...leadIdParam,
  body('body').trim().notEmpty().withMessage('Note body is required'),
];

const deleteLeadNoteValidator = [
  param('leadId').isUUID().withMessage('Invalid lead id'),
  param('noteId').isUUID().withMessage('Invalid note id'),
];

module.exports = {
  createLeadValidator,
  createEnquiryValidator,
  listLeadsValidator,
  leadIdParam,
  updateLeadStatusValidator,
  addLeadNoteValidator,
  deleteLeadNoteValidator,
};
