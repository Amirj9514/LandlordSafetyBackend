/**
 * London pricing zones. The postcodes of every zone come from the final zone documents, kept in
 * ./areaCoverage.js (one list drives both these price zones and the Area Coverage page).
 * Zone 2 is the base-price zone (premium £0). Postcodes that are not in any zone are outside our coverage area.
 */
const { zonePostcodes } = require('./areaCoverage');

const LONDON_ZONES = [
  {
    key: 'zone_1',
    name: 'Zone 1 — Central London',
    sortOrder: 1,
    isDefault: false,
    premium: 0,
    autoCongestionParking: true,
    prefixes: zonePostcodes('zone_1'),
  },
  {
    key: 'zone_2',
    name: 'Zone 2 — Inner London',
    sortOrder: 2,
    isDefault: true,
    premium: 0,
    autoCongestionParking: false,
    prefixes: zonePostcodes('zone_2'),
  },
  {
    key: 'zone_3',
    name: 'Zone 3 — Outer London',
    // Name used before the final zone document; the region seed renames it in place so its prices are kept.
    legacyNames: ['Zone 3 — Outer London Boroughs'],
    sortOrder: 3,
    isDefault: false,
    premium: 0,
    autoCongestionParking: false,
    prefixes: zonePostcodes('zone_3'),
  },
  {
    key: 'zone_4',
    name: 'Zone 4 — M25 London',
    sortOrder: 4,
    isDefault: false,
    premium: 0,
    autoCongestionParking: false,
    prefixes: zonePostcodes('zone_4'),
  },
];

const getZoneBySortOrder = (sortOrder) =>
  LONDON_ZONES.find((z) => z.sortOrder === sortOrder) ?? null;

const getZoneByName = (name) =>
  LONDON_ZONES.find((z) => z.name === name) ?? null;

module.exports = {
  LONDON_ZONES,
  getZoneBySortOrder,
  getZoneByName,
};
