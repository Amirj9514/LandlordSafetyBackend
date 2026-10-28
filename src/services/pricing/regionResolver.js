const { Op } = require('sequelize');
const { Region, RegionPostalPrefix } = require('../../models');

const normalizePostcode = (postcode) => {
  const cleaned = (postcode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length < 5) return { formatted: cleaned, outward: cleaned };
  const inward = cleaned.slice(-3);
  const outward = cleaned.slice(0, -3);
  return { formatted: `${outward} ${inward}`.trim(), outward };
};

/**
 * The postcode district as written (SW1A, E1W, KT11), then the district without its trailing sub-district
 * letter (SW1A -> SW1, W1K -> W1, EC1A -> EC1). Nothing shorter is tried: a district that is not in a zone
 * list (KT11) must not fall into a neighbouring one (KT1), because postcodes that are not listed are outside
 * our coverage area.
 */
const buildPrefixCandidates = (outward) => {
  if (!outward) return [];
  const candidates = [outward];
  const withoutLetter = outward.replace(/(?<=\d)[A-Z]$/, '');
  if (withoutLetter && withoutLetter !== outward) candidates.push(withoutLetter);
  return candidates;
};

const resolveRegionByPostcode = async (postcode) => {
  const { outward } = normalizePostcode(postcode);
  if (!outward) return null;

  const candidates = buildPrefixCandidates(outward);
  if (!candidates.length) return null;

  const prefixes = await RegionPostalPrefix.findAll({
    where: {
      prefix: { [Op.in]: candidates },
    },
    include: [{ model: Region, as: 'region', where: { isActive: true }, required: true }],
  });

  if (!prefixes.length) return null;

  let best = null;
  let bestLen = -1;
  for (const p of prefixes) {
    if (p.prefix.length > bestLen) {
      bestLen = p.prefix.length;
      best = p.region;
    }
  }
  return best;
};

module.exports = {
  normalizePostcode,
  buildPrefixCandidates,
  resolveRegionByPostcode,
};
