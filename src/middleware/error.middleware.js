const { sendError } = require('../utils/apiResponse');
const httpStatus = require('../constants/httpStatus');

const notFoundHandler = (req, res) => {
  return sendError(res, {
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    status: httpStatus.NOT_FOUND,
  });
};

const errorHandler = (err, req, res, _next) => {
  console.error(err);

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const message =
      err.errors?.map((e) => e.message).join(', ') || err.message || 'Validation failed';
    return sendError(res, { message, status: httpStatus.BAD_REQUEST });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return sendError(res, { message: 'Invalid or expired token', status: httpStatus.UNAUTHORIZED });
  }

  const status = err.status || httpStatus.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal server error';

  return sendError(res, { message, status });
};

module.exports = { notFoundHandler, errorHandler };
