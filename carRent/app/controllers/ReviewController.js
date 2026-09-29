const express = require('express');
const router = express.Router();
const ReviewService = require('../service/ReviewService');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const customerOnly = [protect, authorize('customer')];

router.get('/car/:carId', asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, reviews: await ReviewService.getByCar(req.params.carId) });
}));

router.get('/mine', ...customerOnly, asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, reviews: await ReviewService.listMine(req.user._id) });
}));

router.get('/booking/:bookingId', ...customerOnly, asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, ...(await ReviewService.getForBooking(req.user, req.params.bookingId)) });
}));

router.post('/booking/:bookingId', ...customerOnly, asyncHandler(async (req, res) => {
  const review = await ReviewService.create(req.user, req.params.bookingId, req.body);
  res.status(201).json({ success: true, message: 'Thanks for your review!', review });
}));

module.exports = router;