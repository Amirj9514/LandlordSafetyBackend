const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');
const { User } = require('../models');
const { sendError } = require('../utils/apiResponse');
const httpStatus = require('../constants/httpStatus');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, {
        message: 'Access token is required',
        status: httpStatus.UNAUTHORIZED,
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtConfig.secret);

    const user = await User.findByPk(decoded.userId);

    if (!user || !user.isActive) {
      return sendError(res, {
        message: 'User not found or inactive',
        status: httpStatus.UNAUTHORIZED,
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return sendError(res, {
      message: 'Invalid or expired token',
      status: httpStatus.UNAUTHORIZED,
    });
  }
};

module.exports = { authenticate };
