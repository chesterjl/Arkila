const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    password: { 
      type: String, 
      required: [true, 'Password is required'], 
      minlength: [6, 'Password must be at least 6 characters'], 
      select: false 
    },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.CUSTOMER },
    phone: { type: String, required: [true, 'Phone is required'], trim: true },
    address: { type: String, required: [true, 'Address is required'] },
    
    // Car owners only. Defaults to the owner's name if not provided.
    brandName: { type: String, trim: true },

    // Owner Verification Status: 'pending', 'approved', 'rejected'
    ownerStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: function () {
        return this.role === ROLES.OWNER ? 'pending' : undefined;
      },
    },
    rejectionReason: { type: String, trim: true },

    // Admin suspension: a suspended user cannot log in or call any protected route.
    isSuspended: { type: Boolean, default: false, index: true },
    suspensionReason: { type: String, trim: true },
    suspendedAt: Date,
    
    // Car owners only: running total of payouts credited to them (their share only, never the platform fee).
    earnings: {
      type: Number,
      default: function () {
        return this.role === ROLES.OWNER ? 0 : undefined;
      },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);