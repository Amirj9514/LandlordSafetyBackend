const { sendError } = require('../utils/apiResponse');
const httpStatus = require('../constants/httpStatus');
const { ROLE_HIERARCHY } = require('../constants/roles');

const requireRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return sendError(res, {
      message: 'Authentication required',
      status: httpStatus.UNAUTHORIZED,
    });
  }

  const flatRoles = allowedRoles.flat();

  if (!flatRoles.includes(req.user.role)) {
    return sendError(res, {
      message: 'You do not have permission to perform this action',
      status: httpStatus.FORBIDDEN,
    });
  }

  return next();
};

const requireMinRole = (minimumRole) => (req, res, next) => {
  if (!req.user) {
    return sendError(res, {
      message: 'Authentication required',
      status: httpStatus.UNAUTHORIZED,
    });
  }

  const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;

  if (userLevel < requiredLevel) {
    return sendError(res, {
      message: 'You do not have permission to perform this action',
      status: httpStatus.FORBIDDEN,
    });
  }

  return next();
};

module.exports = { requireRoles, requireMinRole };
