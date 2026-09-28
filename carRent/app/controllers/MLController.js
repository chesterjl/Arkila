// Mount in your app entrypoint alongside the other routers, e.g.:
//   app.use('/ml', require('./controller/MLController'));
const express = require('express');
const router = express.Router();
const MLService = require('../service/MLService');
const Car = require('../models/Car');
const ApiError = require('../utils/ApiError');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

// Owner: predict demand for one of THEIR OWN cars in a given month.
// Only the allowed schema fields are forwarded to the ML service.
router.post('/predict-demand', protect, authorize('owner'), asyncHandler(async (req, res) => {
  const { carId, month } = req.body;
  if (!carId || !month) throw new ApiError(400, 'carId and month are required.');

  const car = await Car.findById(carId);
  if (!car) throw new ApiError(404, 'Car not found.');
  if (car.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You are not allowed to access this car.');
  }

  const result = await MLService.predictDemand({
    vehicleType: car.vehicleType,
    fuelType: car.fuelType,
    seats: car.seats,
    location: car.location,
    rentalPrice: car.rentalPrice,
    month: Number(month),
  });

  res.status(200).json({ success: true, ...result });
}));

// Public: re-rank a set of visible car ids by predicted demand for the
// "AI Recommended / High Demand" browse filter. Never throws on ML
// downtime -- responds with available: false so the frontend can fall
// back to its normal sort order.
router.post('/recommend-cars', asyncHandler(async (req, res) => {
  const { carIds, month } = req.body;
  if (!Array.isArray(carIds) || carIds.length === 0) {
    throw new ApiError(400, 'carIds must be a non-empty array.');
  }

  const cars = await Car.find({ _id: { $in: carIds } });

  const result = await MLService.recommendCars({
    month: month ? Number(month) : undefined,
    cars: cars.map((c) => ({
      carId: c._id.toString(),
      vehicleType: c.vehicleType,
      fuelType: c.fuelType,
      seats: c.seats,
      location: c.location,
      rentalPrice: c.rentalPrice,
    })),
  });

  if (!result) {
    return res.status(200).json({ success: true, available: false, recommendations: [] });
  }

  res.status(200).json({ success: true, available: true, recommendations: result.recommendations || [] });
}));

module.exports = router;