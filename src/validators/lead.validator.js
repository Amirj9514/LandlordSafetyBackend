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
  listLeadsValidator,
  leadIdParam,
  updateLeadStatusValidator,
  addLeadNoteValidator,
  deleteLeadNoteValidator,
};
