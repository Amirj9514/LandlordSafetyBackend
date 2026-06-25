const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const bookingRoutes = require('../routes/booking.routes');
const notificationRoutes = require('../routes/notification.routes');
const apiRoutes = require('../routes');
const { ROLES } = require('../constants/roles');
const { BOOKING_STATUS } = require('../constants/bookingStatus');

const findRoute = (router, method, pathSuffix) =>
  router.stack.find(
    (layer) =>
      layer.route?.path?.endsWith(pathSuffix) && layer.route.methods[method.toLowerCase()],
  );

describe('technician portal routes', () => {
  it('registers comment and activity endpoints on bookings router', () => {
    assert.ok(findRoute(bookingRoutes, 'post', '/comments'), 'POST /:id/comments');
    assert.ok(findRoute(bookingRoutes, 'get', '/activities'), 'GET /:id/activities');
  });

  it('mounts /notifications on the API router', () => {
    const mounted = apiRoutes.stack.find(
      (layer) => layer.regexp?.test('/notifications') && layer.name === 'router',
    );
    assert.ok(mounted, 'expected /notifications mount on API router');
  });

  it('registers unread-count on notifications router', () => {
    const layer = notificationRoutes.stack.find(
      (l) => l.route?.path === '/unread-count' && l.route.methods.get,
    );
    assert.ok(layer, 'expected GET /unread-count');
  });
});

describe('technician booking update rules', () => {
  const validateTechnicianUpdate = (booking, payload, actor) => {
    // Mirror booking.service validateTechnicianUpdate for unit testing without DB.
    const { isTechnicianActor } = require('../utils/bookingAccess');
    if (!isTechnicianActor(actor)) return;

    if (booking.technicianId !== actor.id) {
      const error = new Error('You can only update bookings assigned to you');
      error.status = 403;
      throw error;
    }

    const forbidden = [
      'technicianId',
      'paymentStatus',
      'paidAt',
      'adminNotes',
      'metadata',
      'congestionZone',
      'parkingAvailable',
    ];

    for (const key of forbidden) {
      if (payload[key] !== undefined) {
        const error = new Error(`Technicians cannot update ${key}`);
        error.status = 403;
        throw error;
      }
    }

    if (payload.status !== undefined) {
      const allowed =
        booking.status === BOOKING_STATUS.CONFIRMED &&
        payload.status === BOOKING_STATUS.COMPLETED;
      if (!allowed) {
        const error = new Error('Technicians can only mark confirmed bookings as completed');
        error.status = 403;
        throw error;
      }
    }
  };

  const technician = { id: 'tech-1', role: ROLES.TECHNICIAN };
  const booking = { technicianId: 'tech-1', status: BOOKING_STATUS.CONFIRMED };

  it('allows confirmed to completed for assigned technician', () => {
    assert.doesNotThrow(() =>
      validateTechnicianUpdate(booking, { status: BOOKING_STATUS.COMPLETED }, technician),
    );
  });

  it('rejects payment updates from technician', () => {
    assert.throws(
      () => validateTechnicianUpdate(booking, { paymentStatus: 'paid' }, technician),
      (err) => err.status === 403,
    );
  });

  it('rejects updates to unassigned booking', () => {
    assert.throws(
      () =>
        validateTechnicianUpdate(
          { technicianId: 'other', status: BOOKING_STATUS.CONFIRMED },
          { status: BOOKING_STATUS.COMPLETED },
          technician,
        ),
      (err) => err.status === 403,
    );
  });
});
