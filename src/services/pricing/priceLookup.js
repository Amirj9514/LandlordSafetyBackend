const { PricingTier, RegionPrice } = require('../../models');

const loadRegionPriceMap = async (regionId) => {
  if (!regionId) return null;

  const rows = await RegionPrice.findAll({
    where: { regionId },
    include: [{ model: PricingTier, as: 'pricingTier', attributes: ['id', 'tierKey', 'isTbcByDefault'] }],
  });

  const map = {};
  for (const row of rows) {
    map[row.pricingTier.tierKey] = {
      amount: row.amount !== null ? parseFloat(row.amount) : null,
      pricingTierId: row.pricingTierId,
      isTbcByDefault: row.pricingTier.isTbcByDefault,
    };
  }
  return map;
};

const getPrice = (priceMap, tierKey, noRegion) => {
  if (noRegion || !priceMap) {
    return { amount: null, isTbc: true, pricingTierId: null };
  }
  if (!Object.prototype.hasOwnProperty.call(priceMap, tierKey)) {
    return { amount: null, isTbc: true, pricingTierId: null };
  }
  const entry = priceMap[tierKey];
  if (entry.amount === null || entry.amount === undefined) {
    return { amount: null, isTbc: true, pricingTierId: entry.pricingTierId };
  }
  return { amount: entry.amount, isTbc: false, pricingTierId: entry.pricingTierId };
};

const lineFromPrice = ({
  name,
  sub,
  amount,
  isTbc,
  pricingTierId,
  isDiscount = false,
  quoteOnly = false,
  serviceCode = null,
  serviceName = null,
}) => ({
  name,
  sub: sub || '',
  quantity: 1,
  unitPrice: isTbc || quoteOnly ? null : amount,
  total: isTbc || quoteOnly ? null : amount,
  isTbc: isTbc || quoteOnly,
  isDiscount,
  quoteOnly,
  pricingTierId,
  serviceCode: serviceCode ?? null,
  serviceName: serviceName ?? null,
});

module.exports = {
  loadRegionPriceMap,
  getPrice,
  lineFromPrice,
};
