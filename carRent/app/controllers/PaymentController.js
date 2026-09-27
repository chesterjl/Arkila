const express = require('express');
const router = express.Router();
const PaymentService = require('../service/PaymentService');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/auth');

router.post('/xendit/webhook', asyncHandler(async (req, res) => {
    await PaymentService.handleWebhook(req.headers['x-callback-token'], req.body);
    res.status(200).json({ received: true });
  })
);

router.post('/:id/verify-payment', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { type } = req.body; // 'down' or 'balance'

    const updatedBooking = await PaymentService.verifyInvoice(id, type || 'down');
    res.status(200).json({success: true, message: 'Payment verified successfully.', booking: updatedBooking,});
  })
);

module.exports = router;