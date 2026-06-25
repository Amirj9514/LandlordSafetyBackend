const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { ROLES } = require('../constants/roles');
const { evaluateBookingAccess } = require('../utils/bookingAccess');

describe('bookingAccess', () => {
  const booking = { id: 'b1', technicianId: 'tech-1' };
  const technician = { id: 'tech-1', role: ROLES.TECHNICIAN };
  const otherTechnician = { id: 'tech-2', role: ROLES.TECHNICIAN };
  const admin = { id: 'admin-1', role: ROLES.ADMIN };

  it('allows admin to access any booking', () => {
    const result = evaluateBookingAccess(booking, admin);
    assert.equal(result.ok, true);
  });

  it('allows assigned technician', () => {
    const result = evaluateBookingAccess(booking, technician);
    assert.equal(result.ok, true);
  });

  it('denies unassigned technician with 403', () => {
    const result = evaluateBookingAccess(booking, otherTechnician);
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  });

  it('returns 404 when booking is missing', () => {
    const result = evaluateBookingAccess(null, admin);
    assert.equal(result.ok, false);
    assert.equal(result.status, 404);
  });
});
