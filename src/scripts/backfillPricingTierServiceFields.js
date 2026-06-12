require('dotenv').config();
const { Op } = require('sequelize');
const { sequelize, PricingTier, Service, syncModels } = require('../models');

const run = async () => {
  await syncModels({ alter: true });

  const tiers = await PricingTier.findAll({ where: { serviceId: { [Op.ne]: null } } });
  let updated = 0;

  for (const tier of tiers) {
    const svc = await Service.findByPk(tier.serviceId, { attributes: ['code', 'name'] });
    if (!svc) continue;
    await tier.update({ serviceCode: svc.code, serviceName: svc.name });
    updated += 1;
  }

  const cleared = await PricingTier.update(
    { serviceCode: null, serviceName: null },
    { where: { serviceId: null } }
  );

  console.log('Pricing tier service fields backfill complete:', {
    tiersWithService: tiers.length,
    updated,
    globalTiersCleared: cleared[0],
  });
  await sequelize.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
