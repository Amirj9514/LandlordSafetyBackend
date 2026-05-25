const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const httpStatus = require('../constants/httpStatus');
const dashboardService = require('../services/dashboard.service');

const getStats = asyncHandler(async (_req, res) => {
  const data = await dashboardService.getDashboardStats();
  return sendSuccess(res, {
    data,
    message: 'Dashboard stats fetched successfully',
    status: httpStatus.OK,
  });
});

module.exports = { getStats };
