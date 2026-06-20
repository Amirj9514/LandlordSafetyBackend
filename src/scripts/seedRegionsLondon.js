require('dotenv').config();
const { Op } = require('sequelize');
const { sequelize, Region, RegionPostalPrefix, RegionPrice } = require('../models');
const { LONDON_ZONES } = require('../constants/londonZones');

const LEGACY_REGION_NAME = 'London & M25 (Default)';

const removeLegacyRegion = async () => {
  const legacy = await Region.findOne({ where: { name: LEGACY_REGION_NAME } });
  if (!legacy) return;

  await RegionPostalPrefix.destroy({ where: { regionId: legacy.id } });
  await RegionPrice.destroy({ where: { regionId: legacy.id } });
  await legacy.destroy();
  console.log(`Removed legacy region: ${LEGACY_REGION_NAME}`);
};

const run = async () => {
  await sequelize.authenticate();
  await removeLegacyRegion();

  await Region.update({ isDefault: false }, { where: {} });

  const allZonePrefixes = [
    ...new Set(
      LONDON_ZONES.flatMap((zone) =>
        zone.prefixes.map((p) => p.toUpperCase().replace(/\s/g, ''))
      )
    ),
  ].filter(Boolean);

  await RegionPostalPrefix.destroy({ where: { prefix: { [Op.in]: allZonePrefixes } } });

  let totalPrefixes = 0;

  for (const zone of LONDON_ZONES) {
    const [region] = await Region.findOrCreate({
      where: { name: zone.name },
      defaults: {
        name: zone.name,
        isActive: true,
        isDefault: zone.isDefault,
        sortOrder: zone.sortOrder,
      },
    });

    await region.update({
      isActive: true,
      isDefault: zone.isDefault,
      sortOrder: zone.sortOrder,
    });

    await RegionPostalPrefix.destroy({ where: { regionId: region.id } });

    const normalized = [...new Set(zone.prefixes.map((p) => p.toUpperCase().replace(/\s/g, '')))].filter(Boolean);
    for (const prefix of normalized) {
      await RegionPostalPrefix.create({ regionId: region.id, prefix });
    }

    totalPrefixes += normalized.length;
    console.log(`Seeded ${region.name}: ${normalized.length} prefixes`);
  }

  console.log(`Region seed complete: ${LONDON_ZONES.length} zones, ${totalPrefixes} prefixes`);
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => sequelize.close());
