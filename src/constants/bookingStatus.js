const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const ALL_BOOKING_STATUSES = Object.values(BOOKING_STATUS);

/** Admin may set any status from any other (including re-open from cancelled). */
const isValidBookingStatus = (status) => ALL_BOOKING_STATUSES.includes(status);

module.exports = {
  BOOKING_STATUS,
  ALL_BOOKING_STATUSES,
  isValidBookingStatus,
};
