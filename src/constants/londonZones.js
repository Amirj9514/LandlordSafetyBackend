/**
 * London pricing zones from LSL Zone Pricing spec.
 * Zone 2 is the base-price zone (premium £0).
 */
const LONDON_ZONES = [
  {
    key: 'zone_1',
    name: 'Zone 1 — Central London',
    sortOrder: 1,
    isDefault: false,
    premium: 0,
    autoCongestionParking: true,
    prefixes: [
      'EC1', 'EC2', 'EC3', 'EC4',
      'W1', 'SW1', 'WC1', 'WC2',
      'SW3', 'SW5', 'SW7', 'SW10', 'W8', 'W11', 'W14',
    ],
  },
  {
    key: 'zone_2',
    name: 'Zone 2 — Inner London',
    sortOrder: 2,
    isDefault: true,
    premium: 0,
    autoCongestionParking: false,
    prefixes: [
      'NW1', 'NW2', 'NW3', 'NW4', 'NW5', 'NW6', 'NW7', 'NW9', 'NW10', 'NW11',
      'N1', 'N2', 'N3', 'N4', 'N6', 'N7', 'N8', 'N10', 'N11', 'N12', 'N14', 'N15', 'N16', 'N17', 'N18', 'N20', 'N22',
      'E1', 'E2', 'E3', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12', 'E13', 'E14', 'E15', 'E16', 'E17', 'E18',
      'SE1', 'SE2', 'SE3', 'SE4', 'SE5', 'SE6', 'SE7', 'SE8', 'SE9', 'SE10', 'SE11', 'SE12', 'SE13', 'SE14', 'SE15', 'SE16', 'SE17', 'SE18', 'SE19', 'SE20', 'SE21', 'SE22', 'SE23', 'SE24', 'SE25', 'SE26', 'SE27', 'SE28',
      'SW2', 'SW4', 'SW6', 'SW8', 'SW9', 'SW11', 'SW12', 'SW13', 'SW15', 'SW16', 'SW17', 'SW18',
      'W3', 'W4', 'W5', 'W6', 'W7', 'W9', 'W10', 'W12', 'W13',
      'IG1', 'IG2', 'IG3', 'IG4', 'IG5', 'IG6',
      'RM8', 'RM9', 'RM10',
      'EN1', 'EN2', 'EN3', 'EN4', 'EN5',
      'HA0', 'HA9', 'UB1', 'UB2',
    ],
  },
  {
    key: 'zone_3',
    name: 'Zone 3 — Outer London Boroughs',
    sortOrder: 3,
    isDefault: false,
    premium: 0,
    autoCongestionParking: false,
    prefixes: [
      'BR1', 'BR2', 'BR3', 'BR4', 'BR5', 'BR6', 'BR7',
      'SM1', 'SM2', 'SM3', 'SM4', 'SM5', 'SM6',
      'CR0', 'CR2', 'CR4', 'CR7', 'CR8', 'CR9',
      'DA5', 'DA6', 'DA7', 'DA8', 'DA14', 'DA15', 'DA16', 'DA17', 'DA18',
      'RM1', 'RM2', 'RM3', 'RM5', 'RM6', 'RM7', 'RM11', 'RM12', 'RM13', 'RM14',
      'HA1', 'HA2', 'HA3', 'HA7',
      'UB3', 'UB4', 'UB5', 'UB6', 'UB7', 'UB8', 'UB9', 'UB10', 'UB11', 'HA4', 'HA5', 'HA6',
      'TW1', 'TW2', 'TW3', 'TW4', 'TW5', 'TW6', 'TW7', 'TW8', 'TW9', 'TW10', 'TW11', 'TW12', 'TW13', 'TW14',
      'KT1', 'KT2', 'KT3', 'KT4', 'KT5', 'KT6', 'KT9',
      'SW19', 'SW20',
    ],
  },
  {
    key: 'zone_4',
    name: 'Zone 4 — M25 London',
    sortOrder: 4,
    isDefault: false,
    premium: 0,
    autoCongestionParking: false,
    prefixes: [
      'WD3', 'WD6', 'WD7', 'WD17', 'WD18', 'WD19', 'WD23', 'WD24', 'WD25',
      'TW15', 'TW16', 'TW17', 'TW18',
      'KT7', 'KT8', 'KT10', 'KT11', 'KT12', 'KT13',
      'KT17', 'KT18', 'KT19',
      'DA1',
      'EN6', 'EN7', 'EN8', 'EN9', 'EN10', 'EN11',
      'IG7', 'IG10', 'RM4',
      'CR3', 'CR5', 'CR6', 'BR8',
    ],
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
