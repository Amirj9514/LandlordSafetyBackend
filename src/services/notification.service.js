const { Op } = require('sequelize');
const { Notification, User } = require('../models');
const { ROLES, ROLE_HIERARCHY } = require('../constants/roles');

const toPublicNotification = (row) => {
  const plain = row.get ? row.get({ plain: true }) : row;
  return {
    id: plain.id,
    userId: plain.userId,
    bookingId: plain.bookingId,
    activityId: plain.activityId,
    type: plain.type,
    title: plain.title,
    body: plain.body,
    isRead: plain.isRead,
    createdAt: plain.createdAt,
  };
};

const notifyUser = async ({ userId, bookingId, activityId, type, title, body }) => {
  const row = await Notification.create({
    userId,
    bookingId: bookingId || null,
    activityId: activityId || null,
    type,
    title,
    body,
    isRead: false,
  });
  return toPublicNotification(row);
};

const notifyUsers = async (userIds, payload) => {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const results = [];
  for (const userId of uniqueIds) {
    results.push(await notifyUser({ ...payload, userId }));
  }
  return results;
};

const listActiveAdmins = async () => {
  const rows = await User.findAll({
    where: {
      isActive: true,
      role: { [Op.in]: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
    },
    attributes: ['id'],
  });
  return rows.map((r) => r.id);
};

const isAdminRole = (role) => (ROLE_HIERARCHY[role] || 0) >= ROLE_HIERARCHY[ROLES.ADMIN];

const listForUser = async (userId, { unreadOnly = false, page = 1, limit = 20 } = {}) => {
  const offset = (page - 1) * limit;
  const where = { userId };
  if (unreadOnly) where.isRead = false;

  const { rows, count } = await Notification.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return {
    notifications: rows.map(toPublicNotification),
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit) || 1,
    },
  };
};

const unreadCount = async (userId) => {
  const count = await Notification.count({
    where: { userId, isRead: false },
  });
  return { count };
};

const markRead = async (id, userId) => {
  const row = await Notification.findOne({ where: { id, userId } });
  if (!row) {
    const error = new Error('Notification not found');
    error.status = 404;
    throw error;
  }
  await row.update({ isRead: true });
  return toPublicNotification(row);
};

const markAllRead = async (userId) => {
  await Notification.update({ isRead: true }, { where: { userId, isRead: false } });
  return { success: true };
};

module.exports = {
  notifyUser,
  notifyUsers,
  listActiveAdmins,
  isAdminRole,
  listForUser,
  unreadCount,
  markRead,
  markAllRead,
  toPublicNotification,
};
