const { PLATFORM_FEE_PERCENT } = require('../config/constants');

const round2 = (n) => Math.round(n * 100) / 100;

// Splits a rental total into the platform's commission and the owner's share.
const computeFees = (total, percent = PLATFORM_FEE_PERCENT) => {
  const serviceFee = round2((total * percent) / 100);
  return { serviceFeePercent: percent, serviceFee, ownerPayout: round2(total - serviceFee) };
};

module.exports = { computeFees, round2 };