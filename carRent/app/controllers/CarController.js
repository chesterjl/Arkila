// CarController.js
const express = require('express');
const router = express.Router();
const CarService = require('../service/CarService');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');

const ownerOnly = [protect, authorize('owner')];
const adminOnly = [protect, authorize('admin')];

// A car listing takes two images: the car photo and its Certificate of Registration (CR)
const carFiles = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'registrationImage', maxCount: 1 },
]);

router.get('/', asyncHandler(async (req, res) => {
    const cars = await CarService.displayCars(req.query);
    res.status(200).json({ success: true, count: cars.length, cars });
  })
);

router.get('/owner', ...ownerOnly, asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, cars: await CarService.getAllCarsForOwner(req.user._id) });
  })
);

router.get('/owner/pending', ...ownerOnly, asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, cars: await CarService.getAllPendingRentRequestForOwner(req.user._id) });
  })
);

router.get('/admin/pending', ...adminOnly, asyncHandler(async (req, res) => {
    const cars = await CarService.getAllPendingCarListForAdmin();
    res.status(200).json({ success: true, cars });
  })
);

router.get('/admin', ...adminOnly, asyncHandler(async (req, res) => {
    const cars = await CarService.getAllCarsForAdmin();
    res.status(200).json({ success: true, cars });
  })
);

router.get('/:id', asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, car: await CarService.getCarById(req.params.id) });
  })
);

router.post('/', ...ownerOnly, carFiles, asyncHandler(async (req, res) => {
    const car = await CarService.createCar(req.user, req.body, req.files);
    res.status(201).json({ success: true, message: 'Car submitted for admin review', car });
  })
);

router.put('/:id', ...ownerOnly, carFiles, asyncHandler(async (req, res) => {
    const car = await CarService.updateCar(req.user, req.params.id, req.body, req.files);
    res.status(200).json({ success: true, message: 'Car updated', car });
  })
);

router.delete('/:id', ...ownerOnly, asyncHandler(async (req, res) => {
    await CarService.removeCar(req.user, req.params.id);
    res.status(200).json({ success: true, message: 'Car deleted' });
  })
);

router.patch('/:id/approve', ...adminOnly, asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, message: 'Car approved', car: await CarService.approveCar(req.params.id) });
  })
);

router.patch('/:id/reject', ...adminOnly, asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, message: 'Car rejected', car: await CarService.rejectCar(req.params.id, req.body.reason) });
  })
);

router.patch('/:id/suspend', ...adminOnly, asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, message: 'Car suspended', car: await CarService.suspendCar(req.params.id, req.body.reason) });
  })
);

router.patch('/:id/reinstate', ...adminOnly, asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, message: 'Car reinstated', car: await CarService.reinstateCar(req.params.id) });
  })
);

module.exports = router;