const express = require('express');
const router = express.Router();
const BookingService = require('../service/BookingService');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');

const customerOnly = [protect, authorize('customer')];
const ownerOnly = [protect, authorize('owner')];

router.post('/', ...customerOnly, upload.single('idImage'), asyncHandler(async (req, res) => {
    const booking = await BookingService.create(req.user, req.body, req.file);
    res.status(201).json({ success: true, message: 'Rental request submitted', booking });
  })
);

router.get('/customer', ...customerOnly, asyncHandler(async (req, res) => {
    res.status(200).json({ 
      success: true, 
      bookings: await BookingService.getAllPendingBookingForCustomer(req.user._id) 
    });
  })
);

router.get('/customer/history', ...customerOnly, asyncHandler(async (req, res) => {
    res.status(200).json({ 
      success: true, 
      bookings: await BookingService.getAllBookingForCustomer(req.user._id) 
    }); 
  })
);

router.patch('/:id/cancel', ...customerOnly, asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, message: 'Booking cancelled', booking: await BookingService.cancelBooking(req.user, req.params.id) });
  })
);

router.post('/:id/pay-downpayment', ...customerOnly, asyncHandler(async (req, res) => {
    const result = await BookingService.payDownPayment(req.user, req.params.id);
    res.status(200).json({ success: true, ...result });
  })
);

router.post('/:id/pay-balance', ...customerOnly, asyncHandler(async (req, res) => {
    const result = await BookingService.payBalance(req.user, req.params.id, req.body.method);
    res.status(200).json({ success: true, ...result });
  })
);

router.get('/owner/pending', ...ownerOnly, asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, bookings: await BookingService.getAllPendingBookingForOwner(req.user._id) });
})
);

router.get('/owner/history', ...ownerOnly, asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, bookings: await BookingService.getAllBookingForOwner(req.user._id, req.query.status) });
})
);
router.patch('/:id/condition-report', ...ownerOnly, asyncHandler(async (req, res) => {
  const booking = await BookingService.submitConditionReport(req.user, req.params.id, req.body);
  res.status(200).json({success: true, message: 'Condition report submitted and rental completed.', booking,});
})
);

router.patch('/:id/approve', ...ownerOnly, asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, message: 'Booking approved', booking: await BookingService.approveBooking(req.user, req.params.id) });
})
);

router.patch('/:id/reject', ...ownerOnly, asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, message: 'Booking rejected', booking: await BookingService.rejectBooking(req.user, req.params.id, req.body.reason) });
})
);

router.patch('/:id/pickup', ...ownerOnly, asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, message: 'Rental started', booking: await BookingService.markPickedUp(req.user, req.params.id) });
})
);

router.patch('/:id/return', ...ownerOnly, asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, message: 'Car marked as returned', booking: await BookingService.markReturned(req.user, req.params.id, req.body) });
})
);

router.patch('/:id/complete', ...ownerOnly, asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, message: 'Transaction completed', booking: await BookingService.complete(req.user, req.params.id) });
})
);

router.patch('/:id/confirm-balance-f2f', ...ownerOnly, asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, message: 'Cash payment confirmed', booking: await BookingService.confirmBalanceF2F(req.user, req.params.id, req.body.amountReceived) });
})
);

router.get('/:id', protect, asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, booking: await BookingService.getById(req.user, req.params.id) });
})
);

module.exports = router;