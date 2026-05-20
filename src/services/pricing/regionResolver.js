const { Op } = require('sequelize');
const { Region, RegionPostalPrefix } = require('../../models');

const normalizePostcode = (postcode) => {
  const cleaned = (postcode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length < 5) return { formatted: cleaned, outward: cleaned };
  const inward = cleaned.slice(-3);
  const outward = cleaned.slice(0, -3);
  return { formatted: `${outward} ${inward}`.trim(), outward };
};

const buildPrefixCandidates = (outward) => {
  const candidates = [];
  for (let i = outward.length; i >= 1; i -= 1) {
    candidates.push(outward.slice(0, i));
  }
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
