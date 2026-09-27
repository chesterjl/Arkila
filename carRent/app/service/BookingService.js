const Booking = require('../models/Booking');
const Car = require('../models/Car');
const IdDocument = require('../models/IdDocument');
const IdDocumentService = require('./IdDocumentService');
const PaymentService = require('./PaymentService');
const ApiError = require('../utils/ApiError');
const { BOOKING_STATUS: S, BLOCKING_STATUSES, DELIVERY_METHODS, CAR_LISTING_STATUS } = require('../config/constants');

const DAY_MS = 24 * 60 * 60 * 1000;
const round2 = (n) => Math.round(n * 100) / 100;

const populate = (q) =>
  q.populate('car', 'name imageUrl rentalPrice location').populate('customer', 'name email phone address').populate('owner', 'name brandName phone').populate('idDocument', 'idType imageUrl status');

const findOwn = async (id, field, user) => {
  const booking = await Booking.findById(id);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (booking[field].toString() !== user._id.toString()) throw new ApiError(403, 'You are not allowed to access this booking.');
  return booking;
};

const assertStatus = (booking, allowed, action) => {
  if (!allowed.includes(booking.status)) throw new ApiError(400, `Cannot ${action} a booking that is "${booking.status}".`);
};

const hasOverlap = (carId, start, end, excludeId) =>
  Booking.exists({
    car: carId,
    status: { $in: BLOCKING_STATUSES },
    startDate: { $lt: end },
    endDate: { $gt: start },
    ...(excludeId && { _id: { $ne: excludeId } }),
  });

const create = async (customer, body, file) => {
  const { carId, startDate, endDate, idType, deliveryMethod } = body;
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (!carId || isNaN(start) || isNaN(end)) throw new ApiError(400, 'carId, startDate and endDate are required.');
  if (end <= start) throw new ApiError(400, 'End date must be after start date.');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start < today) throw new ApiError(400, 'Start date cannot be in the past.');

  // Delivery: how the car is picked up and returned, as a single value (defaults to the customer doing both themselves)
  if (deliveryMethod && !DELIVERY_METHODS.includes(deliveryMethod)) {
    throw new ApiError(400, `deliveryMethod must be one of: ${DELIVERY_METHODS.join(', ')}`);
  }

  const car = await Car.findById(carId);
  if (!car || !car.isAvailable) throw new ApiError(404, 'Car not found or not available.');
  // Business rule: a rejected listing can't be rented at all, and a suspended one can't take NEW requests.
  if (car.listingStatus !== CAR_LISTING_STATUS.APPROVED) throw new ApiError(400, 'This car is not currently accepting rental requests.');
  if (await hasOverlap(car._id, start, end)) throw new ApiError(409, 'Car is already booked for those dates.');

  // Customer ID: upload once, reuse afterwards
  let idDoc = await IdDocument.findOne({ user: customer._id });
  if (!idDoc) {
    if (!file) throw new ApiError(400, 'Please upload your ID (field "idImage") for owner verification.');
    [idDoc] = await IdDocumentService.addDocuments(customer, [file], idType);
  }

  const totalDays = Math.max(1, Math.ceil((end - start) / DAY_MS));
  const totalPrice = round2(totalDays * car.rentalPrice);
  const downAmount = round2((totalPrice * (Number(process.env.DOWNPAYMENT_PERCENT) || 30)) / 100);

  const booking = await Booking.create({customer: customer._id,owner: car.owner,car: car._id,idDocument: idDoc._id,startDate: start,endDate: end,totalDays,totalPrice,deliveryMethod: deliveryMethod || 'self_pickup_self_return',downPayment: { amount: downAmount },balancePayment: { amount: round2(totalPrice - downAmount) },});
  return populate(Booking.findById(booking._id));
};

// Customer's active bookings: everything from the initial request through the
// handoff and return, right up until the balance is settled (at which point
// it becomes "completed" and moves to the history view instead).
const getAllPendingBookingForCustomer = (userId) =>
  populate(
    Booking.find({
      customer: userId,
      status: { $in: ['pending', 'approved', 'confirmed', 'ongoing', 'returned'] },
    }).sort({ createdAt: -1 })
  );

const getAllBookingForCustomer = (userId) => 
  populate(
    Booking.find({ 
      customer: userId
    }).sort({ createdAt: 1 })
  );
    
const getAllPendingBookingForOwner = (ownerId) => populate(Booking.find({ owner: ownerId, status: S.PENDING }).sort({ createdAt: -1 }));

const getAllBookingForOwner = (ownerId, status) => populate(Booking.find({ owner: ownerId, ...(status && { status }) }).sort({ createdAt: -1 }));

const getById = async (user, id) => {
  const booking = await populate(Booking.findById(id));
  if (!booking) throw new ApiError(404, 'Booking not found.');
  const isParty = [booking.customer._id, booking.owner._id].some((x) => x.toString() === user._id.toString());
  if (!isParty) throw new ApiError(403, 'You are not allowed to view this booking.');
  return booking;
};

// Legacy one-step flow (kept for backward compatibility). The current UI uses
// markReturned to move to "returned", then PaymentService.markPaid completes
// the booking automatically once the balance is paid.
const submitConditionReport = async (owner, id, { isGoodCondition, notes }) => {
  const booking = await findOwn(id, 'owner', owner);

  assertStatus(booking, [S.ONGOING, S.RETURNED], 'submit condition report for');

  booking.conditionReport = {
    isGoodCondition: isGoodCondition === undefined ? true : String(isGoodCondition) === 'true',
    notes: notes || '',
    checkedAt: new Date(),
  };

  booking.status = S.COMPLETED;
  await booking.save();

  return populate(Booking.findById(booking._id));
};

const approveBooking = async (owner, id) => {
  const booking = await findOwn(id, 'owner', owner);
  assertStatus(booking, [S.PENDING], 'approve');
  if (await hasOverlap(booking.car, booking.startDate, booking.endDate, booking._id)) {
    throw new ApiError(409, 'Car was booked by someone else for those dates.');
  }
  booking.status = S.APPROVED;
  await IdDocument.findByIdAndUpdate(booking.idDocument, { status: 'verified' });
  await booking.save();
  return booking;
};

const rejectBooking = async (owner, id, reason) => {
  const booking = await findOwn(id, 'owner', owner);
  assertStatus(booking, [S.PENDING], 'reject');
  booking.status = S.REJECTED;
  booking.rejectionReason = reason || 'Verification/approval failed.';
  await booking.save();
  return booking;
};

const cancelBooking = async (customer, id) => {
  const booking = await findOwn(id, 'customer', customer);
  assertStatus(booking, [S.PENDING, S.APPROVED], 'cancel');
  booking.status = S.CANCELLED;
  await booking.save();
  return booking;
};

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
  const booking = await findOwn(id, 'customer', customer);
  assertStatus(booking, [S.RETURNED], 'pay balance for');

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

  const amount = Number(amountReceived);
  if (!amount || amount <= 0) throw new ApiError(400, 'amountReceived must be a positive number.');

  return PaymentService.confirmF2F(booking, 'balance', amount);
};

//  owner: rental lifecycle 
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
const markReturned = async (owner, id, { isGoodCondition, notes }) => {
  const booking = await findOwn(id, 'owner', owner);
  assertStatus(booking, [S.ONGOING], 'return');
  booking.status = S.RETURNED;
  booking.conditionReport = {
    isGoodCondition: isGoodCondition === undefined ? true : String(isGoodCondition) === 'true',
    notes: notes || '',
    checkedAt: new Date(),
  };
  await booking.save();
  return booking;
};

// Manual override: mark a returned booking complete without going through
// payment. The standard flow no longer needs this -- PaymentService.markPaid
// completes the booking automatically once the balance is paid -- but it's
// kept available in case an owner needs to close out a booking by hand.
const complete = async (owner, id) => {
  const booking = await findOwn(id, 'owner', owner);
  assertStatus(booking, [S.RETURNED], 'complete');
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
    complete};