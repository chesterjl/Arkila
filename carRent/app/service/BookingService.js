// BookingService.js
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const IdDocument = require('../models/IdDocument');
const IdDocumentService = require('./IdDocumentService');
const PaymentService = require('./PaymentService');
const ApiError = require('../utils/ApiError');
const {
  BOOKING_STATUS: S,
  BLOCKING_STATUSES,        // committed bookings (approved -> returned)
  ACTIVE_BOOKING_STATUSES,  // everything that holds a car, INCLUDING pending
  DELIVERY_METHODS,
  CAR_LISTING_STATUS,
  BOOKING_LIMITS,
  ID_TYPES,
} = require('../config/constants');

const DAY_MS = 24 * 60 * 60 * 1000;
const round2 = (n) => Math.round(n * 100) / 100;
const PAYMENT_METHODS = ['online', 'f2f'];

// ---------- validation helpers ----------

// Strict 24-hex check. Also blocks objects like { $ne: null } from reaching a query (NoSQL injection).
const assertId = (value, label = 'id') => {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value) || !mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `Invalid ${label}.`);
  }
};

// Optional free text: must be a string, trimmed, length-capped.
const cleanText = (value, max, label) => {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') throw new ApiError(400, `${label} must be text.`);
  const text = value.trim();
  if (text.length > max) throw new ApiError(400, `${label} must be at most ${max} characters.`);
  return text;
};

// Accepts true/false or the strings "true"/"false" (form/JSON bodies); anything else is rejected.
const parseBool = (value, label, fallback = true) => {
  if (value === undefined) return fallback;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new ApiError(400, `${label} must be true or false.`);
};

const parseDate = (value, label) => {
  if (typeof value !== 'string' || !value) throw new ApiError(400, `${label} is required.`);
  const d = new Date(value);
  if (isNaN(d)) throw new ApiError(400, `${label} is not a valid date.`);
  return d;
};

// ---------- query helpers ----------

const populate = (q) =>
  q.populate('car', 'name imageUrl rentalPrice location').populate('customer', 'name email phone address').populate('owner', 'name brandName phone').populate('idDocument', 'idType imageUrl status');

const findOwn = async (id, field, user) => {
  assertId(id, 'booking id');
  const booking = await Booking.findById(id);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (booking[field].toString() !== user._id.toString()) throw new ApiError(403, 'You are not allowed to access this booking.');
  return booking;
};

const assertStatus = (booking, allowed, action) => {
  if (!allowed.includes(booking.status)) throw new ApiError(400, `Cannot ${action} a booking that is "${booking.status}".`);
};

// Does any booking that holds the car overlap [start, end)?
// Default = ACTIVE statuses, so a PENDING request now blocks the same dates for everyone else.
const overlapQuery = (carId, start, end, statuses) => ({
  car: carId,
  status: { $in: statuses },
  startDate: { $lt: end },
  endDate: { $gt: start },
});

const hasOverlap = (carId, start, end, excludeId, statuses = ACTIVE_BOOKING_STATUSES) =>
  Booking.exists({
    ...overlapQuery(carId, start, end, statuses),
    ...(excludeId && { _id: { $ne: excludeId } }),
  });

// ---------- customer ----------

const create = async (customer, body = {}, file) => {
  const { carId, startDate, endDate, idType, deliveryMethod } = body;

  assertId(carId, 'carId');
  const start = parseDate(startDate, 'startDate');
  const end = parseDate(endDate, 'endDate');

  if (end <= start) throw new ApiError(400, 'End date must be after start date.');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start < today) throw new ApiError(400, 'Start date cannot be in the past.');
  if (start > new Date(today.getTime() + BOOKING_LIMITS.MAX_ADVANCE_DAYS * DAY_MS)) {
    throw new ApiError(400, `Bookings can only be made up to ${BOOKING_LIMITS.MAX_ADVANCE_DAYS} days ahead.`);
  }
  const totalDays = Math.max(1, Math.ceil((end - start) / DAY_MS));
  if (totalDays > BOOKING_LIMITS.MAX_DAYS) {
    throw new ApiError(400, `A single rental can be at most ${BOOKING_LIMITS.MAX_DAYS} days.`);
  }

  // Delivery: how the car is picked up and returned (defaults to the customer doing both themselves)
  if (deliveryMethod !== undefined && (typeof deliveryMethod !== 'string' || !DELIVERY_METHODS.includes(deliveryMethod))) {
    throw new ApiError(400, `deliveryMethod must be one of: ${DELIVERY_METHODS.join(', ')}`);
  }
  if (idType !== undefined && (typeof idType !== 'string' || !ID_TYPES.includes(idType))) {
    throw new ApiError(400, `idType must be one of: ${ID_TYPES.join(', ')}`);
  }

  // Since pending requests now hold a car, cap how many one customer can have open at once
  // (otherwise someone could lock up every car in the marketplace).
  const openRequests = await Booking.countDocuments({ customer: customer._id, status: S.PENDING });
  if (openRequests >= BOOKING_LIMITS.MAX_PENDING_PER_CUSTOMER) {
    throw new ApiError(429, `You can only have ${BOOKING_LIMITS.MAX_PENDING_PER_CUSTOMER} pending requests at a time. Wait for an owner to respond or cancel one.`);
  }

  const car = await Car.findById(carId);
  if (!car || !car.isAvailable) throw new ApiError(404, 'Car not found or not available.');
  // Business rule: a rejected listing can't be rented at all, and a suspended one can't take NEW requests.
  if (car.listingStatus !== CAR_LISTING_STATUS.APPROVED) throw new ApiError(400, 'This car is not currently accepting rental requests.');
  if (car.owner.toString() === customer._id.toString()) throw new ApiError(403, 'You cannot rent your own car.');

  // Blocks the dates if ANY active booking (pending included) already holds the car.
  if (await hasOverlap(car._id, start, end)) {
    throw new ApiError(409, 'This car already has a booking or a pending request for those dates.');
  }

  // Customer ID: upload once, reuse afterwards
  let idDoc = await IdDocument.findOne({ user: customer._id });
  if (idDoc && idDoc.status === 'rejected') {
    throw new ApiError(403, 'Your ID was rejected. Please contact support before booking again.');
  }
  if (!idDoc) {
    if (!file) throw new ApiError(400, 'Please upload your ID (field "idImage") for owner verification.');
    [idDoc] = await IdDocumentService.addDocuments(customer, [file], idType);
  }

  const totalPrice = round2(totalDays * car.rentalPrice);
  const percent = Number(process.env.DOWNPAYMENT_PERCENT);
  const downAmount = round2((totalPrice * (percent > 0 && percent <= 100 ? percent : 30)) / 100);

  const booking = await Booking.create({
    customer: customer._id,
    owner: car.owner,
    car: car._id,
    idDocument: idDoc._id,
    startDate: start,
    endDate: end,
    totalDays,
    totalPrice,
    deliveryMethod: deliveryMethod || 'self_pickup_self_return',
    downPayment: { amount: downAmount },
    balancePayment: { amount: round2(totalPrice - downAmount) },
  });

  // Race-condition guard: two customers can pass the overlap check at the same instant.
  // After inserting, look for an overlapping booking with a LOWER _id (i.e. created first).
  // Exactly one of the two requests has no such rival, so exactly one survives.
  const rival = await Booking.exists({
    ...overlapQuery(car._id, start, end, ACTIVE_BOOKING_STATUSES),
    _id: { $lt: booking._id },
  });
  if (rival) {
    await booking.deleteOne();
    throw new ApiError(409, 'This car was just requested by someone else for those dates.');
  }

  return populate(Booking.findById(booking._id));
};

// Customer's active bookings: everything from the initial request through the
// handoff and return, right up until the balance is settled (at which point
// it becomes "completed" and moves to the history view instead).
const getAllPendingBookingForCustomer = (userId) =>
  populate(
    Booking.find({
      customer: userId,
      status: { $in: ACTIVE_BOOKING_STATUSES },
    }).sort({ createdAt: -1 })
  );

const getAllBookingForCustomer = (userId) =>
  populate(Booking.find({ customer: userId }).sort({ createdAt: 1 }));

// ---------- owner lists ----------

const getAllPendingBookingForOwner = (ownerId) => populate(Booking.find({ owner: ownerId, status: S.PENDING }).sort({ createdAt: -1 }));

const getAllBookingForOwner = (ownerId, status) => {
  // ?status comes straight from the query string: it must be one known status string,
  // never an object/array (e.g. ?status[$ne]=x would otherwise become a Mongo operator).
  if (status !== undefined && (typeof status !== 'string' || !Object.values(S).includes(status))) {
    throw new ApiError(400, `status must be one of: ${Object.values(S).join(', ')}`);
  }
  return populate(Booking.find({ owner: ownerId, ...(status && { status }) }).sort({ createdAt: -1 }));
};

const getById = async (user, id) => {
  assertId(id, 'booking id');
  const booking = await populate(Booking.findById(id));
  if (!booking) throw new ApiError(404, 'Booking not found.');
  const partyIds = [booking.customer?._id, booking.owner?._id].filter(Boolean).map(String);
  if (!partyIds.includes(user._id.toString())) throw new ApiError(403, 'You are not allowed to view this booking.');
  return booking;
};

// ---------- owner decisions ----------

// Legacy one-step flow (kept for backward compatibility). The current UI uses
// markReturned to move to "returned", then PaymentService.markPaid completes
// the booking automatically once the balance is paid.
const submitConditionReport = async (owner, id, { isGoodCondition, notes } = {}) => {
  const booking = await findOwn(id, 'owner', owner);
  assertStatus(booking, [S.ONGOING, S.RETURNED], 'submit condition report for');

  booking.conditionReport = {
    isGoodCondition: parseBool(isGoodCondition, 'isGoodCondition'),
    notes: cleanText(notes, BOOKING_LIMITS.NOTE_MAX, 'notes'),
    checkedAt: new Date(),
  };
  booking.status = S.COMPLETED;
  await booking.save();

  return populate(Booking.findById(booking._id));
};

const approveBooking = async (owner, id) => {
  const booking = await findOwn(id, 'owner', owner);
  assertStatus(booking, [S.PENDING], 'approve');

  // Only COMMITTED bookings can conflict at approval time. Other pending requests for the same
  // dates (possible for requests created before this fix) are auto-declined below.
  if (await hasOverlap(booking.car, booking.startDate, booking.endDate, booking._id, BLOCKING_STATUSES)) {
    throw new ApiError(409, 'Car was booked by someone else for those dates.');
  }

  booking.status = S.APPROVED;
  await booking.save();
  await IdDocument.findByIdAndUpdate(booking.idDocument, { status: 'verified' });

  await Booking.updateMany(
    {
      ...overlapQuery(booking.car, booking.startDate, booking.endDate, [S.PENDING]),
      _id: { $ne: booking._id },
    },
    { status: S.REJECTED, rejectionReason: 'The car was booked by another renter for overlapping dates.' }
  );

  return booking;
};

const rejectBooking = async (owner, id, reason) => {
  const booking = await findOwn(id, 'owner', owner);
  assertStatus(booking, [S.PENDING], 'reject');
  booking.status = S.REJECTED;
  booking.rejectionReason = cleanText(reason, BOOKING_LIMITS.NOTE_MAX, 'reason') || 'Verification/approval failed.';
  await booking.save();
  return booking;
};

// Cancelling frees the car: CANCELLED / REJECTED are not in ACTIVE_BOOKING_STATUSES.
const cancelBooking = async (customer, id) => {
  const booking = await findOwn(id, 'customer', customer);
  assertStatus(booking, [S.PENDING, S.APPROVED], 'cancel');
  booking.status = S.CANCELLED;
  await booking.save();
  return booking;
};

// ---------- payments ----------

const payDownPayment = async (customer, id) => {
  const booking = await findOwn(id, 'customer', customer);
  assertStatus(booking, [S.APPROVED], 'pay downpayment for');

  if (booking.downPayment.status === 'paid') {
    throw new ApiError(400, 'Downpayment is already paid.');
  }
  // Generate or retrieve Xendit invoice checkout redirect
  return PaymentService.createInvoice(booking, customer, 'down');
};

// Balance is settled once the car is back with the owner (status "returned"),
// either online through Xendit or face-to-face in cash (see confirmBalanceF2F,
// which the owner uses to record the cash once received).
const payBalance = async (customer, id, method = 'online') => {
  if (typeof method !== 'string' || !PAYMENT_METHODS.includes(method)) {
    throw new ApiError(400, `method must be one of: ${PAYMENT_METHODS.join(', ')}`);
  }

  const booking = await findOwn(id, 'customer', customer);
  assertStatus(booking, [S.RETURNED], 'pay balance for');

  if (booking.downPayment.status !== 'paid') {
    throw new ApiError(400, 'The downpayment must be paid before the balance.');
  }
  if (booking.balancePayment.status === 'paid') {
    throw new ApiError(400, 'Balance is already paid.');
  }

  if (method === 'f2f') {
    return PaymentService.requestF2F(booking, 'balance');
  }

  // Generate or retrieve Xendit invoice checkout redirect
  return PaymentService.createInvoice(booking, customer, 'balance');
};

// Owner: confirm the cash amount actually received for a face-to-face balance payment.
const confirmBalanceF2F = async (owner, id, amountReceived) => {
  const booking = await findOwn(id, 'owner', owner);
  assertStatus(booking, [S.RETURNED], 'confirm balance payment for');

  if (booking.balancePayment.status === 'paid') {
    throw new ApiError(400, 'Balance is already paid.');
  }

  const amount = Number(amountReceived);
  if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, 'amountReceived must be a positive number.');
  if (amount > booking.balancePayment.amount) {
    throw new ApiError(400, `amountReceived cannot exceed the balance of ${booking.balancePayment.amount}.`);
  }

  return PaymentService.confirmF2F(booking, 'balance', round2(amount));
};

// ---------- owner: rental lifecycle ----------

const markPickedUp = async (owner, id) => {
  const booking = await findOwn(id, 'owner', owner);
  assertStatus(booking, [S.CONFIRMED], 'start rental for');
  booking.status = S.ONGOING;
  await booking.save();
  return booking;
};

// Owner logs the car's condition on return. Status moves to "returned" (not
// straight to "completed") so the customer can then settle the remaining
// balance -- see payBalance / confirmBalanceF2F.
const markReturned = async (owner, id, { isGoodCondition, notes } = {}) => {
  const booking = await findOwn(id, 'owner', owner);
  assertStatus(booking, [S.ONGOING], 'return');
  booking.status = S.RETURNED;
  booking.conditionReport = {
    isGoodCondition: parseBool(isGoodCondition, 'isGoodCondition'),
    notes: cleanText(notes, BOOKING_LIMITS.NOTE_MAX, 'notes'),
    checkedAt: new Date(),
  };
  await booking.save();
  return booking;
};

// Manual override: mark a returned booking complete without going through
// payment. The standard flow no longer needs this -- PaymentService.markPaid
// completes the booking automatically once the balance is paid -- but it's
// kept available in case an owner needs to close out a booking by hand.
// Guard: refuse if money is still owed, so an owner can't silently skip the balance.
const complete = async (owner, id) => {
  const booking = await findOwn(id, 'owner', owner);
  assertStatus(booking, [S.RETURNED], 'complete');
  if (booking.balancePayment.status !== 'paid') {
    throw new ApiError(400, 'The balance has not been paid yet.');
  }
  booking.status = S.COMPLETED;
  await booking.save();
  return booking;
};

module.exports = {
  create,
  getAllPendingBookingForCustomer,
  getAllBookingForCustomer,
  getAllPendingBookingForOwner,
  getAllBookingForOwner,
  getById,
  submitConditionReport,
  approveBooking,
  rejectBooking,
  cancelBooking,
  payDownPayment,
  payBalance,
  confirmBalanceF2F,
  markPickedUp,
  markReturned,
  complete,
};