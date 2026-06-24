const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const adminBookingRoutes = require('../routes/admin/booking.routes');
const apiRoutes = require('../routes');

describe('admin booking routes', () => {
  it('registers POST / on the admin bookings router', () => {
    const postLayer = adminBookingRoutes.stack.find(
      (layer) => layer.route?.path === '/' && layer.route.methods.post,
    );
    assert.ok(postLayer, 'expected POST / on admin bookings router');
  });

  it('mounts /admin/bookings on the API router', () => {
    const mounted = apiRoutes.stack.find(
      (layer) => layer.regexp?.test('/admin/bookings') && layer.name === 'router',
    );
    assert.ok(mounted, 'expected /admin/bookings mount on API router');
  });
});
