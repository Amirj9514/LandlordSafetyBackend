require('dotenv').config();
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret-key-min-32-chars-long';

const { sequelize } = require('../models');
const { getDashboardStats, getMonthRange } = require('../services/dashboard.service');

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
    assert.ok(stats.currentMonth.label);
  });
});
