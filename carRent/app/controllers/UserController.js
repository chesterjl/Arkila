const express = require('express');
const router = express.Router();
const UserService = require('../service/UserService');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');

router.post('/register', upload.fields([{ name: 'idImages', maxCount: 2 }]), asyncHandler(async (req, res) => {
    const data = await UserService.register(req.body, req.files);
    res.status(201).json({ success: true, message: 'User registered successfully', ...data });
  })
);

router.post('/login', asyncHandler(async (req, res) => {
    const data = await UserService.login(req.body);
    res.status(200).json({ success: true, message: 'Login successful', ...data });
  })
);

router.get('/info', protect, asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, user: req.user });
  })
);

router.patch('/info', protect, asyncHandler(async (req, res) => {
    const user = await UserService.updateInfo(req.user, req.body);
    res.status(200).json({ success: true, message: 'Profile updated', user });
  })
);

router.patch('/password', protect, asyncHandler(async (req, res) => {
    await UserService.changePassword(req.user, req.body);
    res.status(200).json({ success: true, message: 'Password updated successfully' });
  })
);

// Get all users (Optional query parameter: ?role=customer or ?role=owner)
router.get('/admin/users', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const users = await UserService.getAllUsers(req.query.role);
    res.status(200).json({ success: true, users });
  })
);

// Get all pending owner verification requests
router.get('/admin/owners/pending', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const owners = await UserService.getPendingOwners();
    res.status(200).json({ success: true, owners });
  })
);

// Approve owner verification
router.patch('/admin/owners/:id/approve', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const user = await UserService.approveOwner(req.params.id);
    res.status(200).json({ success: true, message: 'Owner account approved successfully', user });
  })
);

// Reject owner verification
router.patch('/admin/owners/:id/reject', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const user = await UserService.rejectOwner(req.params.id, req.body.reason);
    res.status(200).json({ success: true, message: 'Owner account rejected', user });
  })
);

router.post('/admin/bootstrap', asyncHandler(async (req, res) => {
    const data = await UserService.bootstrapFirstAdmin(req.body);
    res.status(201).json({ success: true, message: 'First admin account created', ...data });
  })
);

router.post('/admin', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const data = await UserService.createAdmin(req.body);
    res.status(201).json({ success: true, message: 'Admin account created', ...data });
  })
);

module.exports = router;