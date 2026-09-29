// PaymentService.js
const axios = require('axios');
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const PayoutService = require('./PayoutService');
const ApiError = require('../utils/ApiError');
const { BOOKING_STATUS } = require('../config/constants');

const getPart = (booking, type) => (type === 'down' ? booking.downPayment : booking.balancePayment);

const markPaid = async (booking, type) => {
  const payment = getPart(booking, type);

  // Already paid. Retry payout only if the booking is already completed.
  if (payment.status === 'paid') {
    if (booking.status === BOOKING_STATUS.COMPLETED) {
      return (await PayoutService.releaseOwnerPayout(booking)) || booking;
    }
    return booking;
  }

  payment.status = 'paid';
  payment.paidAt = new Date();

  if (type === 'down' && booking.status === BOOKING_STATUS.APPROVED) {
    booking.status = BOOKING_STATUS.CONFIRMED;

    // The car is now committed to this rental.
    await Car.findByIdAndUpdate(booking.car, { isAvailable: false });
  }

  // BALANCE
  /*
    IMPORTANT:
    The customer must first decide whether to:
      1. Leave a review
      2. Skip the review
    Therefore the booking stays visible to the customer through ACTIVE_BOOKING_STATUSES.
  */
  if (type === 'balance' && booking.status === BOOKING_STATUS.RETURNED) {
    booking.status = BOOKING_STATUS.REVIEW_PENDING;
  }

  await booking.save();

  // Payout is intentionally NOT released here. The payout is released only after the customer chooses "Skip review" or submits their review.
  return booking;
};

// CREATE XENDIT INVOICE
const createInvoice = async (booking, customer, type) => {
  const payment = getPart(booking, type);

  // Reuse existing pending invoice.
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
      throw new ApiError(502, `Xendit API Error: ${err.response?.data?.message || err.message}`);
    }
    throw err;
  }
};

// REQUEST F2F PAYMENT
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

// CONFIRM F2F PAYMENT
const confirmF2F = async (booking, type, amountReceived) => {
  const payment = getPart(booking, type);

  if (payment.status === 'paid') {
    return booking;
  }

  payment.method = 'f2f';
  payment.amountReceived = amountReceived;

  // RETURNED -> REVIEW_PENDING for balance payments
  await markPaid(booking, type);

  return booking;
};

// VERIFY XENDIT INVOICE
const verifyInvoice = async (bookingId, type = 'down') => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  const payment = getPart(booking, type);

  if (payment.status === 'paid') {
    return booking;
  }

  if (!payment.invoiceId) {
    throw new ApiError(400, 'No invoice found for this payment.');
  }

  try {
    const response = await axios.get(`https://api.xendit.co/v2/invoices/${payment.invoiceId}`, {
      auth: {
        username: process.env.XENDIT_SECRET_KEY,
        password: '',
      },
    });

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

// XENDIT WEBHOOK
const handleWebhook = async (callbackToken, payload) => {
  if (!callbackToken || callbackToken !== process.env.XENDIT_CALLBACK_TOKEN) {
    throw new ApiError(401, 'Invalid Xendit callback token.');
  }

  const { id, status } = payload;

  const booking = await Booking.findOne({
    $or: [{ 'downPayment.invoiceId': id }, { 'balancePayment.invoiceId': id }],
  });

  if (!booking) return;

  const type = booking.downPayment.invoiceId === id ? 'down' : 'balance';

  if (status === 'PAID' || status === 'SETTLED') {
    await markPaid(booking, type);
  } else if (status === 'EXPIRED') {
    getPart(booking, type).status = 'expired';
    await booking.save();
  }
};

module.exports = {
  markPaid,
  createInvoice,
  requestF2F,
  confirmF2F,
  verifyInvoice,
  handleWebhook,
};