/**
 * Coverage and pricing zones, from the final zone documents (docs/Area-Coverage-Final-Zones.md and
 * docs/LLSI-Final pricing-zones.md). Postcodes not listed are outside LSI's coverage area.
 *
 *  - COVERAGE_GROUPS feeds the Area Coverage page (Inner London, Outer London, M25 London, by borough).
 *  - PRICING_ZONES feeds the four price zones. Zone 1 (Central London) is carved out of Inner London, so
 *    Inner London = Zone 1 + Zone 2 for each borough. src/tests/areaCoverage.test.js checks the two stay in step.
 *
 * Run `node scripts/generate-area-coverage.js` after changing this file to refresh the Area Coverage page.
 */

const COVERAGE_GROUPS = [
  {
    key: 'inner-london',
    name: 'Inner London',
    areas: [
    { name: "City of London", postcodes: ['EC2', 'EC3', 'EC4', 'EC2A', 'EC2M', 'EC2N', 'EC2R', 'EC2V', 'EC2Y', 'EC3A', 'EC3M', 'EC3N', 'EC3R', 'EC3V', 'EC4A', 'EC4M', 'EC4N', 'EC4R', 'EC4V', 'EC4Y'] },
    { name: "Camden", postcodes: ['NW1', 'NW3', 'NW5', 'NW6', 'WC1', 'WC1A', 'WC1B', 'WC1E', 'WC1H', 'WC1N', 'WC1R', 'WC1V', 'WC1X'] },
    { name: "Greenwich", postcodes: ['SE3', 'SE7', 'SE9', 'SE10', 'SE18', 'SE28'] },
    { name: "Hackney", postcodes: ['E5', 'E8', 'E9', 'N16'] },
    { name: "Hammersmith & Fulham", postcodes: ['W6', 'W12', 'W14', 'SW6'] },
    { name: "Islington", postcodes: ['EC1', 'EC1A', 'EC1M', 'EC1N', 'EC1R', 'EC1V', 'EC1Y', 'N1', 'N4', 'N5', 'N7', 'N19'] },
    { name: "Kensington & Chelsea", postcodes: ['SW3', 'SW5', 'SW7', 'SW10', 'W8', 'W10', 'W11'] },
    { name: "Lambeth", postcodes: ['SE11', 'SE19', 'SE24', 'SE27', 'SW2', 'SW4', 'SW8', 'SW9', 'SW16'] },
    { name: "Lewisham", postcodes: ['SE4', 'SE6', 'SE8', 'SE12', 'SE13', 'SE14', 'SE23', 'SE26'] },
    { name: "Southwark", postcodes: ['SE1', 'SE5', 'SE15', 'SE16', 'SE17', 'SE21', 'SE22'] },
    { name: "Tower Hamlets", postcodes: ['E1', 'E1W', 'E2', 'E3', 'E14'] },
    { name: "Wandsworth", postcodes: ['SW11', 'SW12', 'SW15', 'SW17', 'SW18'] },
    { name: "Westminster", postcodes: ['W1', 'W2', 'W9', 'NW8', 'SW1', 'WC2', 'W1B', 'W1C', 'W1D', 'W1F', 'W1G', 'W1H', 'W1J', 'W1K', 'W1S', 'W1T', 'W1U', 'W1W', 'WC2A', 'WC2B', 'WC2E', 'WC2H', 'WC2N', 'WC2R', 'SW1A', 'SW1E', 'SW1H', 'SW1P', 'SW1V', 'SW1W', 'SW1X', 'SW1Y'] },
    ],
  },
  {
    key: 'outer-london',
    name: 'Outer London',
    areas: [
    { name: "Barking & Dagenham", postcodes: ['IG11', 'RM6', 'RM8', 'RM9', 'RM10'] },
    { name: "Barnet", postcodes: ['EN4', 'EN5', 'HA8', 'N2', 'N3', 'N11', 'N12', 'N20', 'NW4', 'NW7', 'NW9', 'NW11'] },
    { name: "Bexley", postcodes: ['DA5', 'DA6', 'DA7', 'DA8', 'DA14', 'DA15', 'DA16', 'DA17', 'DA18', 'SE2'] },
    { name: "Brent", postcodes: ['HA0', 'HA9', 'NW2', 'NW10'] },
    { name: "Bromley", postcodes: ['BR1', 'BR2', 'BR3', 'BR4', 'BR5', 'BR6', 'BR7', 'SE20'] },
    { name: "Croydon", postcodes: ['CR0', 'CR2', 'CR7', 'CR8', 'CR9', 'SE25'] },
    { name: "Ealing", postcodes: ['UB1', 'UB2', 'UB5', 'UB6', 'W3', 'W5', 'W7', 'W13'] },
    { name: "Enfield", postcodes: ['EN1', 'EN2', 'EN3', 'N9', 'N13', 'N14', 'N18', 'N21'] },
    { name: "Haringey", postcodes: ['N6', 'N8', 'N10', 'N15', 'N17', 'N22'] },
    { name: "Harrow", postcodes: ['HA1', 'HA2', 'HA3', 'HA5', 'HA7'] },
    { name: "Havering", postcodes: ['RM1', 'RM2', 'RM3', 'RM5', 'RM7', 'RM11', 'RM12', 'RM13'] },
    { name: "Hillingdon", postcodes: ['HA4', 'HA6', 'TW6', 'UB3', 'UB4', 'UB7', 'UB8', 'UB10', 'UB11'] },
    { name: "Hounslow", postcodes: ['TW3', 'TW4', 'TW5', 'TW7', 'TW8', 'TW13', 'TW14', 'W4'] },
    { name: "Kingston upon Thames", postcodes: ['KT1', 'KT2', 'KT3', 'KT5', 'KT6', 'KT9'] },
    { name: "Merton", postcodes: ['CR4', 'KT4', 'SM4', 'SW19', 'SW20'] },
    { name: "Newham", postcodes: ['E6', 'E7', 'E12', 'E13', 'E15', 'E16', 'E20'] },
    { name: "Redbridge", postcodes: ['E18', 'IG1', 'IG2', 'IG3', 'IG4', 'IG5', 'IG6', 'IG8'] },
    { name: "Richmond upon Thames", postcodes: ['SW13', 'SW14', 'TW1', 'TW2', 'TW9', 'TW10', 'TW11', 'TW12'] },
    { name: "Sutton", postcodes: ['SM1', 'SM2', 'SM3', 'SM5', 'SM6'] },
    { name: "Waltham Forest", postcodes: ['E4', 'E10', 'E11', 'E17'] },
    ],
  },
  {
    key: 'm25-areas',
    name: 'M25 London',
    areas: [
    { name: "Hertfordshire & Buckinghamshire", postcodes: ['WD3', 'WD5', 'WD6', 'WD7', 'WD17', 'WD18', 'WD19', 'WD23', 'WD24', 'WD25'] },
    { name: "Kent & Essex", postcodes: ['IG7', 'IG9', 'IG10', 'RM4', 'RM19', 'BR8', 'DA1'] },
    { name: "Surrey", postcodes: ['CR3', 'CR5', 'CR6', 'KT7', 'KT8', 'KT10', 'KT12', 'KT17', 'KT19', 'SM7', 'TW15', 'TW16', 'TW17'] },
    ],
  },
];

const PRICING_ZONES = {
  zone_1: [
    { name: "City of London", postcodes: ['EC2', 'EC3', 'EC4', 'EC2A', 'EC2M', 'EC2N', 'EC2R', 'EC2V', 'EC2Y', 'EC3A', 'EC3M', 'EC3N', 'EC3R', 'EC3V', 'EC4A', 'EC4M', 'EC4N', 'EC4R', 'EC4V', 'EC4Y'] },
    { name: "Islington", postcodes: ['EC1', 'EC1A', 'EC1M', 'EC1N', 'EC1R', 'EC1V', 'EC1Y'] },
    { name: "Camden", postcodes: ['WC1', 'WC1A', 'WC1B', 'WC1E', 'WC1H', 'WC1N', 'WC1R', 'WC1V', 'WC1X'] },
    { name: "Westminster", postcodes: ['W1', 'W1B', 'W1C', 'W1D', 'W1F', 'W1G', 'W1H', 'W1J', 'W1K', 'W1S', 'W1T', 'W1U', 'W1W', 'WC2', 'WC2A', 'WC2B', 'WC2E', 'WC2H', 'WC2N', 'WC2R', 'SW1', 'SW1A', 'SW1E', 'SW1H', 'SW1P', 'SW1V', 'SW1W', 'SW1X', 'SW1Y'] },
  ],
  zone_2: [
    { name: "Camden", postcodes: ['NW1', 'NW3', 'NW5', 'NW6'] },
    { name: "Greenwich", postcodes: ['SE3', 'SE7', 'SE9', 'SE10', 'SE18', 'SE28'] },
    { name: "Hackney", postcodes: ['E5', 'E8', 'E9', 'N16'] },
    { name: "Hammersmith & Fulham", postcodes: ['W6', 'W12', 'W14', 'SW6'] },
    { name: "Islington", postcodes: ['N1', 'N4', 'N5', 'N7', 'N19'] },
    { name: "Kensington & Chelsea", postcodes: ['SW3', 'SW5', 'SW7', 'SW10', 'W8', 'W10', 'W11'] },
    { name: "Lambeth", postcodes: ['SE11', 'SE19', 'SE24', 'SE27', 'SW2', 'SW4', 'SW8', 'SW9', 'SW16'] },
    { name: "Lewisham", postcodes: ['SE4', 'SE6', 'SE8', 'SE12', 'SE13', 'SE14', 'SE23', 'SE26'] },
    { name: "Southwark", postcodes: ['SE1', 'SE5', 'SE15', 'SE16', 'SE17', 'SE21', 'SE22'] },
    { name: "Tower Hamlets", postcodes: ['E1', 'E1W', 'E2', 'E3', 'E14'] },
    { name: "Wandsworth", postcodes: ['SW11', 'SW12', 'SW15', 'SW17', 'SW18'] },
    { name: "Westminster", postcodes: ['W2', 'W9', 'NW8'] },
  ],
  zone_3: [
    { name: "Barking & Dagenham", postcodes: ['IG11', 'RM6', 'RM8', 'RM9', 'RM10'] },
    { name: "Barnet", postcodes: ['EN4', 'EN5', 'HA8', 'N2', 'N3', 'N11', 'N12', 'N20', 'NW4', 'NW7', 'NW9', 'NW11'] },
    { name: "Bexley", postcodes: ['DA5', 'DA6', 'DA7', 'DA8', 'DA14', 'DA15', 'DA16', 'DA17', 'DA18', 'SE2'] },
    { name: "Brent", postcodes: ['HA0', 'HA9', 'NW2', 'NW10'] },
    { name: "Bromley", postcodes: ['BR1', 'BR2', 'BR3', 'BR4', 'BR5', 'BR6', 'BR7', 'SE20'] },
    { name: "Croydon", postcodes: ['CR0', 'CR2', 'CR7', 'CR8', 'CR9', 'SE25'] },
    { name: "Ealing", postcodes: ['UB1', 'UB2', 'UB5', 'UB6', 'W3', 'W5', 'W7', 'W13'] },
    { name: "Enfield", postcodes: ['EN1', 'EN2', 'EN3', 'N9', 'N13', 'N14', 'N18', 'N21'] },
    { name: "Haringey", postcodes: ['N6', 'N8', 'N10', 'N15', 'N17', 'N22'] },
    { name: "Harrow", postcodes: ['HA1', 'HA2', 'HA3', 'HA5', 'HA7'] },
    { name: "Havering", postcodes: ['RM1', 'RM2', 'RM3', 'RM5', 'RM7', 'RM11', 'RM12', 'RM13'] },
    { name: "Hillingdon", postcodes: ['HA4', 'HA6', 'TW6', 'UB3', 'UB4', 'UB7', 'UB8', 'UB10', 'UB11'] },
    { name: "Hounslow", postcodes: ['TW3', 'TW4', 'TW5', 'TW7', 'TW8', 'TW13', 'TW14', 'W4'] },
    { name: "Kingston upon Thames", postcodes: ['KT1', 'KT2', 'KT3', 'KT5', 'KT6', 'KT9'] },
    { name: "Merton", postcodes: ['CR4', 'KT4', 'SM4', 'SW19', 'SW20'] },
    { name: "Newham", postcodes: ['E6', 'E7', 'E12', 'E13', 'E15', 'E16', 'E20'] },
    { name: "Redbridge", postcodes: ['E18', 'IG1', 'IG2', 'IG3', 'IG4', 'IG5', 'IG6', 'IG8'] },
    { name: "Richmond upon Thames", postcodes: ['SW13', 'SW14', 'TW1', 'TW2', 'TW9', 'TW10', 'TW11', 'TW12'] },
    { name: "Sutton", postcodes: ['SM1', 'SM2', 'SM3', 'SM5', 'SM6'] },
    { name: "Waltham Forest", postcodes: ['E4', 'E10', 'E11', 'E17'] },
  ],
  zone_4: [
    { name: "Hertfordshire", postcodes: ['WD3', 'WD5', 'WD6', 'WD7', 'WD17', 'WD18', 'WD19', 'WD23', 'WD24', 'WD25'] },
    { name: "Essex & Kent", postcodes: ['IG7', 'IG9', 'IG10', 'RM4', 'RM19', 'BR8', 'DA1'] },
    { name: "Surrey", postcodes: ['CR3', 'CR5', 'CR6', 'KT7', 'KT8', 'KT10', 'KT12', 'KT17', 'KT19', 'SM7', 'TW15', 'TW16', 'TW17'] },
  ],
};

/** Every postcode (district) of a pricing zone, upper case and without spaces. */
const zonePostcodes = (zoneKey) => [
  ...new Set((PRICING_ZONES[zoneKey] || []).flatMap((area) => area.postcodes.map((p) => p.replace(/\s/g, '').toUpperCase()))),
];

module.exports = { COVERAGE_GROUPS, PRICING_ZONES, zonePostcodes };
