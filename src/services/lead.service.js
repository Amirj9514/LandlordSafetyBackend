const { Lead, LeadNote } = require('../models');
const { Op } = require('sequelize');
const { LEAD_STATUS } = require('../constants/leadStatus');
const { SUBMISSION_SOURCE } = require('../constants/submissionSource');
const { allocateLeadReference } = require('../utils/referenceNumber');
const { parseContact } = require('../utils/contactParser');
const { PROPERTY_TYPES } = require('../constants/propertyTypes');

const notFound = (message) => {
  const error = new Error(message);
  error.status = 404;
  return error;
};

const createLead = async (body, { source = SUBMISSION_SOURCE.WEBSITE, metadata = {} } = {}) => {
  const contact = parseContact(body.contact);
  if (!contact.valid) {
    const error = new Error('Contact must be a valid email address or phone number');
    error.status = 400;
    throw error;
  }

  const reference = await allocateLeadReference(Lead);

  return Lead.create({
    reference,
    postcode: body.postcode.trim().toUpperCase(),
    propertyType: body.propertyType,
    email: contact.email,
    phone: contact.phone,
    contactType: contact.contactType,
    status: LEAD_STATUS.NEW,
    source,
    metadata: {
      ...metadata,
      form: 'home_quote',
    },
  });
};

// Service-page enquiry form (name, email, phone, message). It has no postcode, and its extra
// fields live in `metadata` so the leads table needs no new columns.
const createEnquiry = async (body, { source = SUBMISSION_SOURCE.WEBSITE, metadata = {} } = {}) => {
  const reference = await allocateLeadReference(Lead);
  const phone = body.phone ? body.phone.replace(/\s+/g, ' ').trim() : null;

  return Lead.create({
    reference,
    postcode: '',
    email: body.email.trim().toLowerCase(),
    phone,
    contactType: 'email',
    propertyType: body.propertyType || PROPERTY_TYPES.RESIDENTIAL,
    status: LEAD_STATUS.NEW,
    source,
    metadata: {
      ...metadata,
      form: 'service_enquiry',
      fullName: body.fullName.trim(),
      message: body.message ? body.message.trim() : null,
      service: body.service ? body.service.trim() : null,
    },
  });
};

const listLeads = async ({ page = 1, limit = 20, propertyType, status, search } = {}) => {
  const offset = (page - 1) * limit;
  const where = {};
  if (propertyType) where.propertyType = propertyType;
  if (status) where.status = status;

  if (search) {
    const term = `%${search.trim()}%`;
    where[Op.or] = [
      { reference: { [Op.iLike]: term } },
      { postcode: { [Op.iLike]: term } },
      { email: { [Op.iLike]: term } },
      { phone: { [Op.iLike]: term } },
    ];
  }

  const { rows, count } = await Lead.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  });

  return {
    leads: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  };
};

const getLeadById = async (id) => {
  const lead = await Lead.findByPk(id, {
    include: [{ association: 'notes', separate: true, order: [['createdAt', 'DESC']] }],
  });
  if (!lead) throw notFound('Lead not found');
  return lead;
};

const updateLeadStatus = async (id, status) => {
  const lead = await Lead.findByPk(id);
  if (!lead) throw notFound('Lead not found');
  lead.status = status;
  await lead.save();
  return getLeadById(id);
};

const deleteLead = async (id) => {
  const lead = await Lead.findByPk(id);
  if (!lead) throw notFound('Lead not found');
  await LeadNote.destroy({ where: { leadId: id } });
  await lead.destroy();
  return { id };
};

const listLeadNotes = async (leadId) => {
  const lead = await Lead.findByPk(leadId);
  if (!lead) throw notFound('Lead not found');

  const notes = await LeadNote.findAll({
    where: { leadId },
    order: [['createdAt', 'DESC']],
  });

  return { notes };
};

const addLeadNote = async (leadId, { body, author }) => {
  const lead = await Lead.findByPk(leadId);
  if (!lead) throw notFound('Lead not found');

  return LeadNote.create({
    leadId,
    authorId: author.id,
    authorName: author.fullName,
    body: body.trim(),
  });
};

const deleteLeadNote = async (leadId, noteId) => {
  const note = await LeadNote.findOne({ where: { id: noteId, leadId } });
  if (!note) throw notFound('Note not found');
  await note.destroy();
  return { id: noteId };
};

module.exports = {
  createLead,
  createEnquiry,
  listLeads,
  getLeadById,
  updateLeadStatus,
  deleteLead,
  listLeadNotes,
  addLeadNote,
  deleteLeadNote,
};
