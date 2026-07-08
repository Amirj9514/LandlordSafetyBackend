const { Op } = require('sequelize');
const { SUBMISSION_SOURCE } = require('../constants/submissionSource');

const applySourceFilter = (where, source) => {
  if (!source) return;

  if (source === SUBMISSION_SOURCE.WEBSITE) {
    where[Op.or] = [{ source: SUBMISSION_SOURCE.WEBSITE }, { source: { [Op.is]: null } }];
    return;
  }

  where.source = source;
};

module.exports = {
  applySourceFilter,
};
