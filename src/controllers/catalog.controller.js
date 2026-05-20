const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const httpStatus = require('../constants/httpStatus');
const catalogService = require('../services/catalog.service');

const getCatalog = asyncHandler(async (req, res) => {
  const data = await catalogService.getCatalog(req.query.propertyType, req.query.postcode);
  return sendSuccess(res, {
    data,
    message: 'Catalog fetched successfully',
    status: httpStatus.OK,
  });
});

module.exports = { getCatalog };
