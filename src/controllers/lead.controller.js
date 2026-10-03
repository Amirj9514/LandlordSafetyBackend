const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const httpStatus = require('../constants/httpStatus');
const leadService = require('../services/lead.service');

const createLead = asyncHandler(async (req, res) => {
  const data = await leadService.createLead(req.body, {
    metadata: {
      userAgent: req.get('user-agent') || null,
      ip: req.ip || null,
    },
  });
  return sendSuccess(res, {
    data,
    message: 'Quote request submitted successfully',
    status: httpStatus.CREATED,
  });
});

const createEnquiry = asyncHandler(async (req, res) => {
  const data = await leadService.createEnquiry(req.body, {
    metadata: {
      userAgent: req.get('user-agent') || null,
      ip: req.ip || null,
      page: req.body.page ? String(req.body.page).slice(0, 200) : null,
    },
  });
  return sendSuccess(res, {
    data,
    message: 'Enquiry submitted successfully',
    status: httpStatus.CREATED,
  });
});

const listLeads = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const data = await leadService.listLeads({
    page,
    limit,
    propertyType: req.query.propertyType,
    status: req.query.status,
    search: req.query.search,
  });
  return sendSuccess(res, {
    data,
    message: 'Leads fetched successfully',
    status: httpStatus.OK,
  });
});

const getLead = asyncHandler(async (req, res) => {
  const data = await leadService.getLeadById(req.params.id);
  return sendSuccess(res, {
    data,
    message: 'Lead fetched successfully',
    status: httpStatus.OK,
  });
});

const updateLeadStatus = asyncHandler(async (req, res) => {
  const data = await leadService.updateLeadStatus(req.params.id, req.body.status);
  return sendSuccess(res, {
    data,
    message: 'Lead status updated successfully',
    status: httpStatus.OK,
  });
});

const deleteLead = asyncHandler(async (req, res) => {
  const data = await leadService.deleteLead(req.params.id);
  return sendSuccess(res, {
    data,
    message: 'Lead deleted successfully',
    status: httpStatus.OK,
  });
});

const listLeadNotes = asyncHandler(async (req, res) => {
  const data = await leadService.listLeadNotes(req.params.id);
  return sendSuccess(res, {
    data,
    message: 'Lead notes fetched successfully',
    status: httpStatus.OK,
  });
});

const addLeadNote = asyncHandler(async (req, res) => {
  const data = await leadService.addLeadNote(req.params.id, {
    body: req.body.body,
    author: req.user,
  });
  return sendSuccess(res, {
    data,
    message: 'Note added successfully',
    status: httpStatus.CREATED,
  });
});

const deleteLeadNote = asyncHandler(async (req, res) => {
  const data = await leadService.deleteLeadNote(req.params.leadId, req.params.noteId);
  return sendSuccess(res, {
    data,
    message: 'Note deleted successfully',
    status: httpStatus.OK,
  });
});

module.exports = {
  createLead,
  createEnquiry,
  listLeads,
  getLead,
  updateLeadStatus,
  deleteLead,
  listLeadNotes,
  addLeadNote,
  deleteLeadNote,
};
