const BOOKING_ACTIVITY_ACTIONS = {
  ASSIGNED: 'assigned',
  UNASSIGNED: 'unassigned',
  STATUS_CHANGED: 'status_changed',
  COMMENT_ADDED: 'comment_added',
  PAYMENT_CHANGED: 'payment_changed',
};

const ALL_BOOKING_ACTIVITY_ACTIONS = Object.values(BOOKING_ACTIVITY_ACTIONS);

module.exports = { BOOKING_ACTIVITY_ACTIONS, ALL_BOOKING_ACTIVITY_ACTIONS };
