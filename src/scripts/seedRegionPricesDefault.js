require('dotenv').config();
const { sequelize, Region, PricingTier, RegionPrice } = require('../models');
const { LONDON_ZONES } = require('../constants/londonZones');
const { getPricesForZoneKey } = require('./seed/zonePrices');

const run = async () => {
  await sequelize.authenticate();

  const tiers = await PricingTier.findAll();
  let upserted = 0;

  for (const zone of LONDON_ZONES) {
    const region = await Region.findOne({ where: { name: zone.name } });
    if (!region) {
      throw new Error(`Run seedRegionsLondon.js first — region not found: ${zone.name}`);
    }

    const zonePrices = getPricesForZoneKey(zone.key);
    if (!zonePrices) {
      throw new Error(`No price matrix for zone: ${zone.key}`);
    }

    for (const tier of tiers) {
      let amount = null;
      if (Object.prototype.hasOwnProperty.call(zonePrices, tier.tierKey)) {
        amount = zonePrices[tier.tierKey];
      } else if (tier.isTbcByDefault) {
        amount = null;
      }

      const [row] = await RegionPrice.findOrCreate({
        where: { regionId: region.id, pricingTierId: tier.id },
        defaults: { regionId: region.id, pricingTierId: tier.id, amount },
      });
      await row.update({ amount });
      upserted += 1;
    }

    console.log(`Seeded prices for ${region.name}`);
  }

  console.log(`Region prices seed complete: ${upserted} tier rows across ${LONDON_ZONES.length} zones`);
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => sequelize.close());
