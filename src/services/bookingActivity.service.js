const { BookingActivity } = require('../models');

const toPublicActivity = (row) => {
  const plain = row.get ? row.get({ plain: true }) : row;
  return {
    id: plain.id,
    bookingId: plain.bookingId,
    actorId: plain.actorId,
    actorName: plain.actorName,
    actorRole: plain.actorRole,
    action: plain.action,
    message: plain.message,
    payload: plain.payload || {},
    createdAt: plain.createdAt,
  };
};

const logActivity = async ({ bookingId, actor, action, message, payload = {} }) => {
  const row = await BookingActivity.create({
    bookingId,
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action,
    message,
    payload,
  });
  return toPublicActivity(row);
};

const listByBooking = async (bookingId, { page = 1, limit = 50 } = {}) => {
  const offset = (page - 1) * limit;
  const { rows, count } = await BookingActivity.findAndCountAll({
    where: { bookingId },
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return {
    activities: rows.map(toPublicActivity),
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit) || 1,
    },
  };
};

module.exports = {
  logActivity,
  listByBooking,
  toPublicActivity,
};
