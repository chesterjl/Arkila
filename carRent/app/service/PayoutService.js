const Booking = require('../models/Booking');
const User = require('../models/User');
const { BOOKING_STATUS, ROLES } = require('../config/constants');
const { computeFees } = require('../utils/feeutil.js');

// Credits the owner's share (totalPrice - platform fee) to the car owner's earnings, exactly once.
// Only car owners are ever credited; the platform fee is never added to any user.
// Returns the updated booking, or null when there was nothing to do (not eligible / already released).
const releaseOwnerPayout = async (booking) => {
  if (booking.status !== BOOKING_STATUS.COMPLETED) return null;
  if (booking.downPayment?.status !== 'paid' || booking.balancePayment?.status !== 'paid') return null;

  // Older bookings have no fee snapshot: compute it now and store it.
  const fees =
    booking.serviceFee != null && booking.ownerPayout != null
      ? { serviceFeePercent: booking.serviceFeePercent, serviceFee: booking.serviceFee, ownerPayout: booking.ownerPayout }
      : computeFees(booking.totalPrice);

  // Atomic claim: only one caller can flip pending -> released, so a webhook retry can never double-credit.
  const claimed = await Booking.findOneAndUpdate(
    { _id: booking._id, 'payout.status': { $ne: 'released' } },
    {
      $set: {
        ...fees,
        'payout.status': 'released',
        'payout.amount': fees.ownerPayout,
        'payout.releasedAt': new Date(),
      },
    },
    { new: true }
  );
  if (!claimed) return null;

  try {
    const res = await User.updateOne(
      { _id: claimed.owner, role: ROLES.OWNER },
      { $inc: { earnings: fees.ownerPayout } }
    );
    if (res.matchedCount === 0) throw new Error('Owner account not found for payout.');
  } catch (err) {
    // Undo the claim so the payout can be retried later.
    await Booking.updateOne(
      { _id: claimed._id },
      { $set: { 'payout.status': 'pending' }, $unset: { 'payout.amount': '', 'payout.releasedAt': '' } }
    );
    throw err;
  }

  return claimed;
};

// Admin helper: credits every completed, fully paid booking that was finished before payouts existed.
const releasePending = async () => {
  const bookings = await Booking.find({
    status: BOOKING_STATUS.COMPLETED,
    'downPayment.status': 'paid',
    'balancePayment.status': 'paid',
    'payout.status': { $ne: 'released' },
  });
  let released = 0;
  for (const b of bookings) {
    if (await releaseOwnerPayout(b)) released += 1;
  }
  return { released };
};

module.exports = { releaseOwnerPayout, releasePending };