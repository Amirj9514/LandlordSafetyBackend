const { sendSuccess } = require('../utils/apiResponse');
const httpStatus = require('../constants/httpStatus');

const getHealth = (_req, res) => {
  return sendSuccess(res, {
    data: {
      service: 'landlord-safety-api',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    message: 'Service is running',
    status: httpStatus.OK,
  });
};

module.exports = { getHealth };
