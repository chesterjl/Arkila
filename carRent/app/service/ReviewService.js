// ReviewService.js
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const ApiError = require('../utils/ApiError');
const { maskName } = require('../utils/Maskutil.js');
const { BOOKING_STATUS, REVIEW_LIMITS } = require('../config/constants');

const assertId = (value, label = 'id') => {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value) || !mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `Invalid ${label}.`);
  }
};

const loadOwnBooking = async (customer, bookingId) => {
  assertId(bookingId, 'booking id');
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (booking.customer.toString() !== customer._id.toString()) throw new ApiError(403, 'You are not allowed to review this booking.');
  return booking;
};

// A review unlocks only after the balance is paid (online or confirmed face-to-face) and the rental is completed.
const isEligible = (b) => b.status === BOOKING_STATUS.REVIEW_PENDING && b.balancePayment?.status === 'paid';

const getForBooking = async (customer, bookingId) => {
  const booking = await loadOwnBooking(customer, bookingId);
  const review = await Review.findOne({ booking: booking._id });
  return { canReview: isEligible(booking) && !review, review };
};

const create = async (customer, bookingId, body = {}) => {
  const booking = await loadOwnBooking(customer, bookingId);
  if (!isEligible(booking)) throw new ApiError(400, 'You can review a rental once the balance is paid.');
  if (await Review.exists({ booking: booking._id })) throw new ApiError(409, 'You already reviewed this rental.');

  if (typeof body.message !== 'string') throw new ApiError(400, 'message must be text.');
  const message = body.message.trim();
  if (!message) throw new ApiError(400, 'Review message cannot be empty.');
  if (message.length > REVIEW_LIMITS.MESSAGE_MAX) throw new ApiError(400, `Review must be at most ${REVIEW_LIMITS.MESSAGE_MAX} characters.`);

  return Review.create({ booking: booking._id, car: booking.car, customer: customer._id, owner: booking.owner, message });
};

// Public. The full name is masked HERE so it never leaves the server.
const getByCar = async (carId) => {
  assertId(carId, 'car id');
  const reviews = await Review.find({ car: carId }).populate('customer', 'name').sort({ createdAt: -1 });
  return reviews.map((r) => ({
    _id: r._id,
    message: r.message,
    createdAt: r.createdAt,
    reviewerName: maskName(r.customer?.name),
  }));
};

const listMine = (customerId) => Review.find({ customer: customerId }).select('booking createdAt');

module.exports = { getForBooking, create, getByCar, listMine };