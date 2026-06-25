const { Booking } = require('../models');
const { ROLES, ROLE_HIERARCHY } = require('../constants/roles');

const isAdminActor = (actor) =>
  (ROLE_HIERARCHY[actor?.role] || 0) >= ROLE_HIERARCHY[ROLES.ADMIN];

const isTechnicianActor = (actor) => actor?.role === ROLES.TECHNICIAN;

const evaluateBookingAccess = (booking, actor) => {
  if (!booking) {
    return { ok: false, status: 404, message: 'Booking not found' };
  }
  if (isAdminActor(actor)) {
    return { ok: true, booking };
  }
  if (isTechnicianActor(actor) && booking.technicianId === actor.id) {
    return { ok: true, booking };
  }
  return { ok: false, status: 403, message: 'You do not have access to this booking' };
};

const assertBookingAccess = async (bookingId, actor) => {
  const booking = await Booking.findByPk(bookingId);
  const result = evaluateBookingAccess(booking, actor);
  if (!result.ok) {
    const error = new Error(result.message);
    error.status = result.status;
    throw error;
  }
  return booking;
};

module.exports = {
  assertBookingAccess,
  evaluateBookingAccess,
  isAdminActor,
  isTechnicianActor,
};
