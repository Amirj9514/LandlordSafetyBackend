const { Op } = require('sequelize');
const {
  Region,
  RegionPostalPrefix,
  RegionPrice,
  PricingTier,
  Service,
} = require('../models');

const listRegions = async () => {
  return Region.findAll({
    order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    include: [{ model: RegionPostalPrefix, as: 'prefixes' }],
  });
};

const getRegion = async (id) => {
  const region = await Region.findByPk(id, {
    include: [{ model: RegionPostalPrefix, as: 'prefixes' }],
  });
  if (!region) {
    const error = new Error('Region not found');
    error.status = 404;
    throw error;
  }
  return region;
};

const createRegion = async ({ name, isActive = true, sortOrder = 0 }) => {
  return Region.create({ name, isActive, isDefault: false, sortOrder });
};

const updateRegion = async (id, payload) => {
  const region = await getRegion(id);
  await region.update(payload);
  return getRegion(id);
};

const deleteRegion = async (id) => {
  const region = await getRegion(id);
  if (region.isDefault) {
    const error = new Error('Cannot delete the default region');
    error.status = 400;
    throw error;
  }
  await RegionPostalPrefix.destroy({ where: { regionId: id } });
  await RegionPrice.destroy({ where: { regionId: id } });
  await region.destroy();
  return { deleted: true };
};

const replacePrefixes = async (regionId, prefixes = []) => {
  await getRegion(regionId);
  const normalized = [...new Set(prefixes.map((p) => p.toUpperCase().replace(/\s/g, '')))].filter(Boolean);

  const conflicts = await RegionPostalPrefix.findAll({
    where: {
      prefix: { [Op.in]: normalized },
      regionId: { [Op.ne]: regionId },
    },
  });
  if (conflicts.length) {
    const error = new Error(`Prefixes already assigned to another region: ${conflicts.map((c) => c.prefix).join(', ')}`);
    error.status = 409;
    throw error;
  }

  await RegionPostalPrefix.destroy({ where: { regionId } });
  for (const prefix of normalized) {
    await RegionPostalPrefix.create({ regionId, prefix });
  }
  return getRegion(regionId);
};

const getRegionPrices = async (regionId) => {
  await getRegion(regionId);
  const prices = await RegionPrice.findAll({ where: { regionId } });
  const priceByTierId = Object.fromEntries(prices.map((p) => [p.pricingTierId, p]));

  const tiers = await PricingTier.findAll({
    order: [['sortOrder', 'ASC'], ['tierKey', 'ASC']],
    include: [
      {
        model: Service,
        as: 'service',
        attributes: ['id', 'code', 'name'],
        required: false,
      },
    ],
  });

  return tiers.map((tier) => ({
    pricingTierId: tier.id,
    tierKey: tier.tierKey,
    label: tier.label,
    serviceId: tier.serviceId,
    serviceCode: tier.serviceCode ?? tier.service?.code ?? null,
    serviceName: tier.serviceName ?? tier.service?.name ?? null,
    isTbcByDefault: tier.isTbcByDefault,
    amount: priceByTierId[tier.id]?.amount ?? null,
    regionPriceId: priceByTierId[tier.id]?.id ?? null,
  }));
};

const upsertRegionPrices = async (regionId, priceEntries = []) => {
  await getRegion(regionId);
  const results = [];

  for (const entry of priceEntries) {
    let tierId = entry.pricingTierId;
    if (!tierId && entry.tierKey) {
      const tier = await PricingTier.findOne({ where: { tierKey: entry.tierKey } });
      if (!tier) continue;
      tierId = tier.id;
    }
    if (!tierId) continue;

    const amount = entry.amount === undefined ? null : entry.amount;

    const [row] = await RegionPrice.findOrCreate({
      where: { regionId, pricingTierId: tierId },
      defaults: { regionId, pricingTierId: tierId, amount },
    });
    await row.update({ amount });
    results.push(row);
  }

  return getRegionPrices(regionId);
};

module.exports = {
  listRegions,
  getRegion,
  createRegion,
  updateRegion,
  deleteRegion,
  replacePrefixes,
  getRegionPrices,
  upsertRegionPrices,
};
