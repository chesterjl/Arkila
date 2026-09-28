const mongoose = require('mongoose');
const { VEHICLE_TYPES, FUEL_TYPES, CAR_LISTING_STATUS } = require('../config/constants');

const carSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Car name is required'], trim: true },
    description: { type: String, trim: true, default: '' },
    rentalPrice: { type: Number, required: [true, 'Rental price is required'], min: [1, 'Rental price must be greater than 0'] }, // per day
    imageUrl: { type: String, required: [true, 'Car image is required'] },
    imagePublicId: { type: String, required: true },
    vehicleType: { type: String, enum: VEHICLE_TYPES, required: [true, 'Vehicle type is required'] },
    fuelType: { type: String, enum: FUEL_TYPES, required: [true, 'Fuel type is required'] },
    location: { type: String, required: [true, 'Location is required'], trim: true },
    seats: { type: Number, required: [true, 'Number of seats is required'], min: 1 },
    isAvailable: { type: Boolean, default: true }, // owner can switch a car off
      
    // Certificate of Registration (CR/OR-CR) proving this specific car belongs to this owner.
    registrationImageUrl: { type: String, required: [true, 'Certificate of Registration image is required'] },
    registrationImagePublicId: { type: String, required: true },
    
    // Admin review. A car is not publicly visible/bookable until an admin approves it.
    listingStatus: { type: String, enum: Object.values(CAR_LISTING_STATUS), default: CAR_LISTING_STATUS.PENDING, index: true },
    adminNote: String,   // reason given on rejection or suspension
    reviewedAt: Date,    // last time an admin approved/rejected/suspended/reinstated this listing
  },
  { timestamps: true }
);

module.exports = mongoose.model('Car', carSchema);