require('dotenv').config();
const { sequelize, Region, PricingTier, RegionPrice } = require('../models');
const defaultPrices = require('./seed/defaultPrices');

const run = async () => {
  await sequelize.authenticate();

  const region = await Region.findOne({ where: { isDefault: true } });
  if (!region) {
    throw new Error('Run seedRegionsLondon.js first — no default region found');
  }

  const tiers = await PricingTier.findAll();
  let upserted = 0;

  for (const tier of tiers) {
    const amount = Object.prototype.hasOwnProperty.call(defaultPrices, tier.tierKey)
      ? defaultPrices[tier.tierKey]
      : tier.isTbcByDefault
        ? null
        : null;

    const [row] = await RegionPrice.findOrCreate({
      where: { regionId: region.id, pricingTierId: tier.id },
      defaults: { regionId: region.id, pricingTierId: tier.id, amount },
    });
    await row.update({ amount });
    upserted += 1;
  }

  console.log(`Region prices seed complete: ${upserted} tiers for ${region.name}`);
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => sequelize.close());
