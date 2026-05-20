const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/apiResponse');
const httpStatus = require('../constants/httpStatus');
const asyncHandler = require('../utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  return sendSuccess(res, {
    data: result,
    message: 'Login successful',
    status: httpStatus.OK,
  });
});

module.exports = { login };
