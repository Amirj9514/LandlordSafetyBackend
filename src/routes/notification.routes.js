const express = require('express');
const {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);

module.exports = router;
