const express = require('express');
const {
  createLead,
  listLeads,
  getLead,
  updateLeadStatus,
  deleteLead,
  listLeadNotes,
  addLeadNote,
  deleteLeadNote,
} = require('../controllers/lead.controller');
const {
  createLeadValidator,
  listLeadsValidator,
  leadIdParam,
  updateLeadStatusValidator,
  addLeadNoteValidator,
  deleteLeadNoteValidator,
} = require('../validators/lead.validator');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { requireMinRole } = require('../middleware/role.middleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.post('/', createLeadValidator, validate, createLead);

router.use(authenticate);
router.use(requireMinRole(ROLES.ADMIN));

router.get('/', listLeadsValidator, validate, listLeads);
router.get('/:id/notes', leadIdParam, validate, listLeadNotes);
router.post('/:id/notes', addLeadNoteValidator, validate, addLeadNote);
router.delete('/:leadId/notes/:noteId', deleteLeadNoteValidator, validate, deleteLeadNote);
router.get('/:id', leadIdParam, validate, getLead);
router.patch('/:id/status', updateLeadStatusValidator, validate, updateLeadStatus);
router.delete('/:id', leadIdParam, validate, deleteLead);

module.exports = router;
