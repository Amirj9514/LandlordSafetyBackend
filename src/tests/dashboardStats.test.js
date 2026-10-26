require('dotenv').config();
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret-key-min-32-chars-long';

const { sequelize } = require('../models');
const { getDashboardStats, getMonthRange, summarizeLineItems } = require('../services/dashboard.service');

let dbAvailable = false;

before(async () => {
  try {
    await sequelize.authenticate();
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
});

describe('dashboard.service', () => {
  it('getMonthRange returns current calendar month', () => {
    const { year, month, start, end } = getMonthRange(new Date('2026-05-15T12:00:00Z'));
    assert.equal(year, 2026);
    assert.equal(month, 5);
    assert.equal(start.getMonth(), 4);
    assert.equal(end.getMonth(), 4);
  });

  it('summarizeLineItems groups revenue by service and separates booking-level lines', () => {
    const summary = summarizeLineItems([
      { bookingId: 'b1', description: 'Gas Safety Certificate (CP12)', serviceCode: 'gsc', serviceName: 'Gas Safety Certificate (CP12)', total: '54.99', isTbc: false, isDiscount: false },
      { bookingId: 'b1', description: 'Boiler Service', serviceCode: 'boiler', serviceName: 'Boiler Service', total: '79.99', isTbc: false, isDiscount: false },
      { bookingId: 'b1', description: 'Bundle Discount — CP12 + Boiler Service', serviceCode: null, total: '-24.99', isTbc: false, isDiscount: true },
      { bookingId: 'b1', description: 'Priority Service', serviceCode: null, total: '99.00', isTbc: false, isDiscount: false },
      { bookingId: 'b2', description: 'Gas Safety Certificate (CP12)', serviceCode: 'gsc', serviceName: 'Gas Safety Certificate (CP12)', total: '64.99', isTbc: false, isDiscount: false },
      { bookingId: 'b2', description: 'Congestion Charge', serviceCode: null, total: '18.00', isTbc: false, isDiscount: false },
      { bookingId: 'b3', description: 'Asbestos Survey', serviceCode: 'asbestos', total: null, isTbc: true, isDiscount: false },
    ]);
    assert.deepEqual(summary.topServices, [
      { serviceCode: 'gsc', serviceName: 'Gas Safety Certificate (CP12)', bookings: 2, revenue: 119.98 },
      { serviceCode: 'boiler', serviceName: 'Boiler Service', bookings: 1, revenue: 79.99 },
    ]);
    assert.deepEqual(summary.adjustments, { priorityService: 99, otherCharges: 18, discounts: -24.99 });
    assert.equal(summary.priorityServiceBookings, 1);
  });

  it('getDashboardStats returns expected shape', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const stats = await getDashboardStats();
    assert.ok(stats.activeTechnicians);
    assert.equal(typeof stats.activeTechnicians.count, 'number');
    assert.ok(Array.isArray(stats.activeTechnicians.technicians));
    assert.equal(typeof stats.pendingBookings, 'number');
    assert.equal(typeof stats.unpaidBookings, 'number');
    assert.ok(stats.currentMonth);
    assert.equal(typeof stats.currentMonth.completedBookings, 'number');
    assert.equal(typeof stats.currentMonth.revenue, 'number');
    assert.equal(typeof stats.pendingQuotations, 'number');
    assert.equal(typeof stats.newLeads, 'number');
    assert.equal(typeof stats.currentMonth.bookingsReceived, 'number');
    assert.equal(typeof stats.currentMonth.priorityServiceBookings, 'number');
    assert.ok(Array.isArray(stats.currentMonth.topServices));
    assert.ok(stats.currentMonth.adjustments);
    assert.ok(stats.currentMonth.label);
  });
});
