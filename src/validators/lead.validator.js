const { body, query, param } = require('express-validator');
const { ALL_PROPERTY_TYPES } = require('../constants/propertyTypes');
const { ALL_LEAD_STATUSES } = require('../constants/leadStatus');
const { parseContactFields, isValidUkPhone, CONTACT_MESSAGES } = require('../utils/contactParser');
const { CONTACT_SUBJECTS } = require('../constants/contactSubjects');

// Email and phone are separate, optional fields, but at least one is required and any value
// given must be valid (see parseContactFields). Each error is reported on its own field.
const contactFieldCheck = (field) =>
  body(field).custom((_, { req }) => {
    const { errors } = parseContactFields(req.body);
    if (errors[field]) throw new Error(errors[field]);
    return true;
  });

const createLeadValidator = [
  body('postcode').trim().notEmpty().withMessage('Postcode is required'),
  body('propertyType').isIn(ALL_PROPERTY_TYPES).withMessage('Invalid property type'),
  body('email').optional({ values: 'falsy' }).isString().isLength({ max: 255 }).withMessage('Email is too long'),
  body('phone').optional({ values: 'falsy' }).isString().isLength({ max: 50 }).withMessage('Phone is too long'),
  contactFieldCheck('email'),
  contactFieldCheck('phone'),
  contactFieldCheck('contact'),
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
  // Contact page form: a Subject is sent, which makes the message required and the phone a UK number.
  body('subject')
    .optional({ values: 'falsy' })
    .trim()
    .isIn(CONTACT_SUBJECTS)
    .withMessage('Please select a subject'),
  body('phone').custom((value, { req }) => {
    if (req.body.subject && value && !isValidUkPhone(String(value))) throw new Error(CONTACT_MESSAGES.phone);
    return true;
  }),
  body('message')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Message must be 2000 characters or fewer'),
  body('message').custom((value, { req }) => {
    if (req.body.subject && !String(value || '').trim()) throw new Error('Message is required');
    return true;
  }),
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
