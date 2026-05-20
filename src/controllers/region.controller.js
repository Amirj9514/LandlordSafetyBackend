const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const httpStatus = require('../constants/httpStatus');
const regionService = require('../services/region.service');

const listRegions = asyncHandler(async (req, res) => {
  const data = await regionService.listRegions();
  return sendSuccess(res, { data, message: 'Regions fetched successfully', status: httpStatus.OK });
});

const getRegion = asyncHandler(async (req, res) => {
  const data = await regionService.getRegion(req.params.id);
  return sendSuccess(res, { data, message: 'Region fetched successfully', status: httpStatus.OK });
});

const createRegion = asyncHandler(async (req, res) => {
  const data = await regionService.createRegion(req.body);
  return sendSuccess(res, { data, message: 'Region created successfully', status: httpStatus.CREATED });
});

const updateRegion = asyncHandler(async (req, res) => {
  const data = await regionService.updateRegion(req.params.id, req.body);
  return sendSuccess(res, { data, message: 'Region updated successfully', status: httpStatus.OK });
});

const deleteRegion = asyncHandler(async (req, res) => {
  const data = await regionService.deleteRegion(req.params.id);
  return sendSuccess(res, { data, message: 'Region deleted successfully', status: httpStatus.OK });
});

const replacePrefixes = asyncHandler(async (req, res) => {
  const data = await regionService.replacePrefixes(req.params.id, req.body.prefixes);
  return sendSuccess(res, { data, message: 'Region prefixes updated successfully', status: httpStatus.OK });
});

const getRegionPrices = asyncHandler(async (req, res) => {
  const data = await regionService.getRegionPrices(req.params.id);
  return sendSuccess(res, { data, message: 'Region prices fetched successfully', status: httpStatus.OK });
});

const upsertRegionPrices = asyncHandler(async (req, res) => {
  const data = await regionService.upsertRegionPrices(req.params.id, req.body.prices);
  return sendSuccess(res, { data, message: 'Region prices updated successfully', status: httpStatus.OK });
});

module.exports = {
  listRegions,
  getRegion,
  createRegion,
  updateRegion,
  deleteRegion,
  replacePrefixes,
  getRegionPrices,
  upsertRegionPrices,
};
