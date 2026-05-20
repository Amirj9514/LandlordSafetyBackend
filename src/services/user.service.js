const { Op } = require('sequelize');
const { User } = require('../models');
const { ROLES, ROLE_HIERARCHY } = require('../constants/roles');
const { toPublicUser } = require('../utils/userSerializer');

const canManageRole = (actorRole, targetRole) => {
  const actorLevel = ROLE_HIERARCHY[actorRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
  return actorLevel > targetLevel;
};

const assertCanManageUser = (actor, targetUser) => {
  if (actor.id === targetUser.id) return;

  if (!canManageRole(actor.role, targetUser.role)) {
    const error = new Error('You cannot manage this user');
    error.status = 403;
    throw error;
  }
};

const assertCanAssignRole = (actor, roleToAssign) => {
  if (!roleToAssign) return;

  if (actor.role === ROLES.ADMIN && roleToAssign === ROLES.SUPER_ADMIN) {
    const error = new Error('Admins cannot assign superAdmin role');
    error.status = 403;
    throw error;
  }

  if (!canManageRole(actor.role, roleToAssign)) {
    const error = new Error('You cannot assign this role');
    error.status = 403;
    throw error;
  }
};

const listUsers = async (actor, { page = 1, limit = 20, search = '' } = {}) => {
  const offset = (page - 1) * limit;
  const where = {};

  if (actor.role !== ROLES.SUPER_ADMIN) {
    where.role = { [Op.ne]: ROLES.SUPER_ADMIN };
  }

  if (search) {
    where[Op.or] = [
      { email: { [Op.iLike]: `%${search}%` } },
      { fullName: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    limit,
    offset,
    order: [['created_at', 'DESC']],
  });

  return {
    users: rows.map(toPublicUser),
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 1,
    },
  };
};

const getUserById = async (id) => {
  const user = await User.findByPk(id);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  return toPublicUser(user);
};

const createUser = async (actor, payload) => {
  const role = payload.role || ROLES.TECHNICIAN;
  assertCanAssignRole(actor, role);

  const existing = await User.findOne({ where: { email: payload.email.toLowerCase() } });
  if (existing) {
    const error = new Error('Email already in use');
    error.status = 409;
    throw error;
  }

  const user = await User.create({
    email: payload.email.toLowerCase(),
    password: payload.password,
    fullName: payload.fullName,
    role,
    phoneNumber: payload.phoneNumber || null,
    secondaryPhoneNumber: payload.secondaryPhoneNumber || null,
    address: payload.address || null,
    additionalData: payload.additionalData || {},
    isActive: payload.isActive !== undefined ? payload.isActive : true,
    createdBy: actor.id,
    updatedBy: actor.id,
  });

  return toPublicUser(user);
};

const updateUser = async (actor, id, payload) => {
  const user = await User.findByPk(id);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  assertCanManageUser(actor, user);

  if (payload.role) {
    assertCanAssignRole(actor, payload.role);
  }

  if (payload.email && payload.email.toLowerCase() !== user.email) {
    const existing = await User.findOne({ where: { email: payload.email.toLowerCase() } });
    if (existing) {
      const error = new Error('Email already in use');
      error.status = 409;
      throw error;
    }
    user.email = payload.email.toLowerCase();
  }

  const fields = [
    'fullName',
    'role',
    'phoneNumber',
    'secondaryPhoneNumber',
    'address',
    'additionalData',
    'isActive',
  ];

  for (const field of fields) {
    if (payload[field] !== undefined) {
      user[field] = payload[field];
    }
  }

  if (payload.password) {
    user.password = payload.password;
  }

  user.updatedBy = actor.id;
  await user.save();

  return toPublicUser(user);
};

const deleteUser = async (actor, id) => {
  if (actor.id === id) {
    const error = new Error('You cannot delete your own account');
    error.status = 400;
    throw error;
  }

  const user = await User.findByPk(id);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  assertCanManageUser(actor, user);
  await user.destroy();
  return { id };
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
