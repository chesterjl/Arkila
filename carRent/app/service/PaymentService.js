const axios = require('axios');
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const ApiError = require('../utils/ApiError');
const { BOOKING_STATUS } = require('../config/constants');

// Helper to extract payment partition
const getPart = (booking, type) => (type === 'down' ? booking.downPayment : booking.balancePayment);

// Shared method: marks a payment as paid and progresses booking status
const markPaid = async (booking, type) => {
  const payment = getPart(booking, type);
  if (payment.status === 'paid') return booking; // Prevent double updates

  payment.status = 'paid';
  payment.paidAt = new Date();

  // Progress status from APPROVED -> CONFIRMED upon downpayment receipt
  if (type === 'down' && booking.status === BOOKING_STATUS.APPROVED) {
    booking.status = BOOKING_STATUS.CONFIRMED;
    // The car is now committed to this rental, so take it off the marketplace.
    // Completion (see BookingService.complete) intentionally does NOT flip
    // this back to true -- the owner re-lists it manually once they've had a
    // chance to clean/inspect it (CarService.updateCar, via the owner's car list UI).
    await Car.findByIdAndUpdate(booking.car, { isAvailable: false });
  }

  // Balance settled while the car is back with the owner -> the rental is done.
  if (type === 'balance' && booking.status === BOOKING_STATUS.RETURNED) {
    booking.status = BOOKING_STATUS.COMPLETED;
  }

  await booking.save();
  return booking;
};

// XENDIT INTEGRATION: Create Invoice
const createInvoice = async (booking, customer, type) => {
  const payment = getPart(booking, type);

  // Reuse existing pending invoice URL if already generated (and the customer
  // hasn't since switched to face-to-face for this payment).
  if (payment.status === 'pending' && payment.invoiceUrl && payment.method !== 'f2f') {
    return { invoiceUrl: payment.invoiceUrl, amount: payment.amount };
  }

  try {
    const response = await axios.post(
      'https://api.xendit.co/v2/invoices',
      {
        external_id: `booking-${booking._id}-${type}-${Date.now()}`,
        amount: payment.amount,
        currency: process.env.XENDIT_CURRENCY || 'PHP',
        payer_email: customer.email,
        description: `CarRent ${type === 'down' ? 'downpayment' : 'balance'} for booking ${booking._id}`,
        // "type" is included so the frontend knows which payment to verify once it lands back here.
        success_redirect_url: `${process.env.FRONTEND_URL}/customer/bookings?payment=success&bookingId=${booking._id}&type=${type}`,
        failure_redirect_url: `${process.env.FRONTEND_URL}/customer/bookings?payment=failed&bookingId=${booking._id}&type=${type}`,
      },
      {
        auth: {
          username: process.env.XENDIT_SECRET_KEY,
          password: '',
        },
      }
    );

    const data = response.data;

    payment.method = 'online';
    payment.invoiceId = data.id;
    payment.invoiceUrl = data.invoice_url;
    payment.status = 'pending';
    await booking.save();

    return { invoiceUrl: data.invoice_url, amount: payment.amount };
  } catch (err) {
    if (err.isAxiosError) {
      throw new ApiError(
        502,
        `Xendit API Error: ${err.response?.data?.message || err.message}`
      );
    }
    throw err;
  }
};

// Customer chose to pay face-to-face in cash instead of online. No Xendit
// invoice is created here -- this just records the customer's choice so the
// owner knows cash is coming, and the owner later confirms receipt via confirmF2F.
const requestF2F = async (booking, type) => {
  const payment = getPart(booking, type);
  if (payment.status === 'paid') {
    return { alreadyPaid: true, amount: payment.amount };
  }

  payment.method = 'f2f';
  payment.status = 'pending';
  await booking.save();

  return { method: 'f2f', amount: payment.amount };
};

// Owner confirms the cash amount actually received for a face-to-face payment.
const confirmF2F = async (booking, type, amountReceived) => {
  const payment = getPart(booking, type);
  if (payment.status === 'paid') return booking;

  payment.method = 'f2f';
  payment.amountReceived = amountReceived;
  await markPaid(booking, type);
  return booking;
};

// Verify status directly from Xendit API
const verifyInvoice = async (bookingId, type = 'down') => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');

  const payment = getPart(booking, type);

  // If already paid, return early
  if (payment.status === 'paid') return booking;

  if (!payment.invoiceId) {
    throw new ApiError(400, 'No invoice found for this payment.');
  }

  // Fetch status directly from Xendit
  try {
    const response = await axios.get(
      `https://api.xendit.co/v2/invoices/${payment.invoiceId}`,
      {
        auth: {
          username: process.env.XENDIT_SECRET_KEY,
          password: '',
        },
      }
    );

    const invoice = response.data;
    if (invoice.status === 'PAID' || invoice.status === 'SETTLED') {
      await markPaid(booking, type);
    } else if (invoice.status === 'EXPIRED') {
      payment.status = 'expired';
      await booking.save();
    }

    return booking;
  } catch (err) {
    if (err.isAxiosError) {
      throw new ApiError(502, `Xendit API Error: ${err.response?.data?.message || err.message}`);
    }
    throw err;
  }
};

// Handles Webhook / Callback POST requests dispatched by Xendit
const handleWebhook = async (callbackToken, payload) => {
  if (!callbackToken || callbackToken !== process.env.XENDIT_CALLBACK_TOKEN) {
    throw new ApiError(401, 'Invalid Xendit callback token.');
  }

  const { id, status } = payload;
  const booking = await Booking.findOne({
    $or: [{ 'downPayment.invoiceId': id }, { 'balancePayment.invoiceId': id }],
  });

  if (!booking) return; // Ignore unknown/unrelated invoices

  const type = booking.downPayment.invoiceId === id ? 'down' : 'balance';

  if (status === 'PAID' || status === 'SETTLED') {
    await markPaid(booking, type);
  } else if (status === 'EXPIRED') {
    getPart(booking, type).status = 'expired';
    await booking.save();
  }
};

// Export all methods together at the bottom of the file
module.exports = {
  markPaid,
  createInvoice,
  requestF2F,
  confirmF2F,
  verifyInvoice,
  handleWebhook,
};