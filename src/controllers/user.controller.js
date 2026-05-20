const userService = require('../services/user.service');
const { sendSuccess } = require('../utils/apiResponse');
const httpStatus = require('../constants/httpStatus');
const asyncHandler = require('../utils/asyncHandler');
const { toPublicUser } = require('../utils/userSerializer');

const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    data: toPublicUser(req.user),
    message: 'Profile fetched successfully',
    status: httpStatus.OK,
  });
});

const listUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const search = req.query.search || '';

  const result = await userService.listUsers(req.user, { page, limit, search });

  return sendSuccess(res, {
    data: result,
    message: 'Users fetched successfully',
    status: httpStatus.OK,
  });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);

  return sendSuccess(res, {
    data: user,
    message: 'User fetched successfully',
    status: httpStatus.OK,
  });
});

const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.user, req.body);

  return sendSuccess(res, {
    data: user,
    message: 'User created successfully',
    status: httpStatus.CREATED,
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.user, req.params.id, req.body);

  return sendSuccess(res, {
    data: user,
    message: 'User updated successfully',
    status: httpStatus.OK,
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const result = await userService.deleteUser(req.user, req.params.id);

  return sendSuccess(res, {
    data: result,
    message: 'User deleted successfully',
    status: httpStatus.OK,
  });
});

module.exports = {
  getMe,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
