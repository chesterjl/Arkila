const mongoose = require('mongoose');
const { BOOKING_STATUS, DELIVERY_METHODS } = require('../config/constants');

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    status: { type: String, enum: ['unpaid', 'pending', 'paid', 'expired'], default: 'unpaid' },
    
    // 'online' = paid through Xendit (auto-approved for now). 'f2f' = cash/in-person, confirmed by the owner.
    method: { type: String, enum: ['online', 'f2f'], default: 'online' },
    amountReceived: Number, // f2f only: the actual amount the owner says they received

    invoiceId: String,   // Xendit invoice id
    invoiceUrl: String,  // Xendit checkout page
    paidAt: Date,
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },

    // The customer's ID that the owner reviews for this request
    idDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'IdDocument', required: true },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    
    // How the car changes hands, one of the 4 values in DELIVERY_METHODS
    // (self_pickup_self_return, self_pickup_owner_pickup, owner_delivery_self_return, owner_delivery_owner_pickup)
    deliveryMethod: { type: String, enum: DELIVERY_METHODS, default: 'self_pickup_self_return' },

    downPayment: { type: paymentSchema, required: true },
    balancePayment: { type: paymentSchema, required: true },

    status: { type: String, enum: Object.values(BOOKING_STATUS), default: BOOKING_STATUS.PENDING, index: true },
    rejectionReason: String,
    
    // Filled by the owner when the car is returned
    conditionReport: {
      isGoodCondition: Boolean,
      notes: String,
      checkedAt: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);