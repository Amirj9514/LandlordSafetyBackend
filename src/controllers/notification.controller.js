const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const httpStatus = require('../constants/httpStatus');
const notificationService = require('../services/notification.service');

const listNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const unreadOnly = req.query.unreadOnly === 'true';
  const data = await notificationService.listForUser(req.user.id, {
    page,
    limit,
    unreadOnly,
  });
  return sendSuccess(res, {
    data,
    message: 'Notifications fetched successfully',
    status: httpStatus.OK,
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const data = await notificationService.unreadCount(req.user.id);
  return sendSuccess(res, {
    data,
    message: 'Unread count fetched successfully',
    status: httpStatus.OK,
  });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const data = await notificationService.markRead(req.params.id, req.user.id);
  return sendSuccess(res, {
    data,
    message: 'Notification marked as read',
    status: httpStatus.OK,
  });
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const data = await notificationService.markAllRead(req.user.id);
  return sendSuccess(res, {
    data,
    message: 'All notifications marked as read',
    status: httpStatus.OK,
  });
});

module.exports = {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
