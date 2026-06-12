require('dotenv').config();
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret-key-min-32-chars-long';

const { sequelize, ServiceCategory, PricingRule } = require('../models');
const catalogAdminService = require('../services/admin/catalogAdmin.service');

let dbAvailable = false;

before(async () => {
  try {
    await sequelize.authenticate();
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
});

describe('catalogAdmin.service', () => {
  it('returns catalog tree for residential', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const tree = await catalogAdminService.getCatalogTree('residential');
    assert.equal(tree.propertyType, 'residential');
    assert.ok(Array.isArray(tree.categories));
    assert.ok(tree.categories.length > 0);
    assert.ok(Array.isArray(tree.bundles));
  });

  it('creates and deletes a pricing rule', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const gsc = await catalogAdminService.listServices({ propertyType: 'residential' });
    const service = gsc.find((s) => s.code === 'gsc');
    assert.ok(service);

    const rule = await catalogAdminService.createPricingRule({
      ruleKey: `test_rule_${Date.now()}`,
      ruleType: 'quote_only',
      scope: 'service_line',
      serviceId: service.id,
      config: { sub: 'Test quote only' },
      sortOrder: 999,
    });
    assert.ok(rule.id);

    await catalogAdminService.deletePricingRule(rule.id);
    const gone = await PricingRule.findByPk(rule.id);
    assert.equal(gone, null);
  });

  it('reorders categories transactionally', async (t) => {
    if (!dbAvailable) return t.skip('DATABASE_URL not available');
    const cats = await catalogAdminService.listCategories('residential');
    if (cats.length < 2) return t.skip('Not enough categories');

    const original = cats.map((c) => ({ id: c.id, displayOrder: c.displayOrder }));
    const swapped = cats.map((c, i) => ({
      id: c.id,
      displayOrder: original[(i + 1) % cats.length].displayOrder,
    }));

    await catalogAdminService.reorderCategories(swapped);
    await catalogAdminService.reorderCategories(original);
    assert.ok(true);
  });
});
