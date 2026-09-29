const express = require('express');
const router = express.Router();
const AdminService = require('../service/AdminService');
const PayoutService = require('../service/PayoutService');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const adminOnly = [protect, authorize('admin')];

router.get('/stats', ...adminOnly, asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, stats: await AdminService.getStats() });
  })
);

// One-time sync: credit owners for rentals completed before automatic payouts existed. Safe to run repeatedly.
router.post('/payouts/release-pending', ...adminOnly, asyncHandler(async (req, res) => {
    const result = await PayoutService.releasePending();
    res.status(200).json({ success: true, message: `${result.released} payout(s) released`, ...result });
  })
);

module.exports = router;