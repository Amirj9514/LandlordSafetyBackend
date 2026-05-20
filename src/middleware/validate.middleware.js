const { validationResult } = require('express-validator');
const { sendError } = require('../utils/apiResponse');
const httpStatus = require('../constants/httpStatus');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, {
      message: 'Validation failed',
      status: httpStatus.BAD_REQUEST,
      data: errors.array(),
    });
  }
  return next();
};

module.exports = validate;
