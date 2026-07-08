const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const httpStatus = require('../constants/httpStatus');
const quotationService = require('../services/quotation.service');

const createQuotation = asyncHandler(async (req, res) => {
  const data = await quotationService.createQuotation(req.body);
  return sendSuccess(res, {
    data,
    message: 'Quotation submitted successfully',
    status: httpStatus.CREATED,
  });
});

const listQuotations = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const data = await quotationService.listQuotations({
    page,
    limit,
    propertyType: req.query.propertyType,
    status: req.query.status,
    source: req.query.source,
  });
  return sendSuccess(res, {
    data,
    message: 'Quotations fetched successfully',
    status: httpStatus.OK,
  });
});

const getQuotation = asyncHandler(async (req, res) => {
  const data = await quotationService.getQuotationById(req.params.id);
  return sendSuccess(res, {
    data,
    message: 'Quotation fetched successfully',
    status: httpStatus.OK,
  });
});

const updateQuotationLines = asyncHandler(async (req, res) => {
  const data = await quotationService.updateQuotationLines(req.params.id, req.body.lines);
  return sendSuccess(res, {
    data,
    message: 'Quotation lines updated successfully',
    status: httpStatus.OK,
  });
});

const updateQuotationStatus = asyncHandler(async (req, res) => {
  const data = await quotationService.updateQuotationStatus(req.params.id, req.body.status);
  return sendSuccess(res, {
    data,
    message: 'Quotation status updated successfully',
    status: httpStatus.OK,
  });
});

const convertQuotation = asyncHandler(async (req, res) => {
  const data = await quotationService.convertQuotationToBooking(req.params.id);
  return sendSuccess(res, {
    data,
    message: 'Quotation converted to booking successfully',
    status: httpStatus.CREATED,
  });
});

module.exports = {
  createQuotation,
  listQuotations,
  getQuotation,
  updateQuotationLines,
  updateQuotationStatus,
  convertQuotation,
};
