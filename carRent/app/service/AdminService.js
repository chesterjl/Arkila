const User = require('../models/User');
const Car = require('../models/Car');
const Booking = require('../models/Booking');
const { ROLES, CAR_LISTING_STATUS, BOOKING_STATUS, PLATFORM_FEE_PERCENT } = require('../config/constants');
const { round2 } = require('../utils/feeutil');

// Platform-wide numbers for the admin dashboard.
// Fees/payouts come from completed bookings; older bookings without a fee snapshot use the current rate.
const getStats = async () => {
  const [
    totalCustomers,
    totalOwners,
    totalCars,
    pendingOwners,
    pendingCars,
    suspendedAccounts,
    suspendedCars,
    money,
  ] = await Promise.all([
    User.countDocuments({ role: ROLES.CUSTOMER }),
    User.countDocuments({ role: ROLES.OWNER }),
    Car.countDocuments(),
    User.countDocuments({ role: ROLES.OWNER, ownerStatus: 'pending' }),
    Car.countDocuments({ listingStatus: CAR_LISTING_STATUS.PENDING }),
    User.countDocuments({ isSuspended: true }),
    Car.countDocuments({ listingStatus: CAR_LISTING_STATUS.SUSPENDED }),
    Booking.aggregate([
      { $match: { status: BOOKING_STATUS.COMPLETED } },
      {
        $group: {
          _id: null,
          completedRentals: { $sum: 1 },
          grossVolume: { $sum: '$totalPrice' },
          platformFees: { $sum: { $ifNull: ['$serviceFee', { $multiply: ['$totalPrice', PLATFORM_FEE_PERCENT / 100] }] } },
          ownerPayouts: { $sum: { $ifNull: ['$ownerPayout', { $multiply: ['$totalPrice', (100 - PLATFORM_FEE_PERCENT) / 100] }] } },
        },
      },
    ]),
  ]);

  const m = money[0] || {};
  return {
    totalCustomers,
    totalOwners,
    totalCars,
    pendingOwners,
    pendingCars,
    suspendedAccounts,
    suspendedCars,
    completedRentals: m.completedRentals || 0,
    grossVolume: round2(m.grossVolume || 0),
    platformFees: round2(m.platformFees || 0),
    ownerPayouts: round2(m.ownerPayouts || 0),
  };
};

module.exports = { getStats };