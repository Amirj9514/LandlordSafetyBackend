require('dotenv').config();
const { sequelize, Region, RegionPostalPrefix } = require('../models');
const londonPrefixes = require('./seed/londonPrefixes');

const run = async () => {
  await sequelize.authenticate();

  const [region] = await Region.findOrCreate({
    where: { name: 'London & M25 (Default)' },
    defaults: {
      name: 'London & M25 (Default)',
      isActive: true,
      isDefault: true,
      sortOrder: 0,
    },
  });

  await region.update({ isActive: true, isDefault: true });

  let created = 0;
  for (const raw of londonPrefixes) {
    const prefix = raw.toUpperCase().replace(/\s/g, '');
    const [row] = await RegionPostalPrefix.findOrCreate({
      where: { prefix },
      defaults: { regionId: region.id, prefix },
    });
    if (row.regionId !== region.id) {
      await row.update({ regionId: region.id });
    }
    created += 1;
  }

  console.log(`Region seed complete: ${region.name}, ${created} prefixes`);
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => sequelize.close());
