const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const httpStatus = require('../constants/httpStatus');
const quoteService = require('../services/quote.service');

const previewQuote = asyncHandler(async (req, res) => {
  const data = await quoteService.previewQuote(req.body);
  return sendSuccess(res, {
    data,
    message: 'Quote calculated successfully',
    status: httpStatus.OK,
  });
});

const getRegionPrices = asyncHandler(async (req, res) => {
  const data = await quoteService.getRegionPricesByPostcode(req.query.postcode);
  return sendSuccess(res, {
    data,
    message: 'Region prices fetched successfully',
    status: httpStatus.OK,
  });
});

module.exports = { previewQuote, getRegionPrices };
