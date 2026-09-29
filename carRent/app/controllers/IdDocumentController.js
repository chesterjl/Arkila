// IdDocumentController.js
const express = require('express');
const router = express.Router();
const IdDocumentService = require('../service/IdDocumentService');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');

router.get('/me', protect, asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, ids: await IdDocumentService.getByUser(req.user._id) });
  })
);

router.post('/',  protect, authorize('owner', 'customer'), upload.array('idImages', 2), asyncHandler(async (req, res) => {
    const ids = await IdDocumentService.addDocuments(req.user, req.files);
    res.status(201).json({ success: true, ids });
  })
);

router.patch('/:id', protect, authorize('owner', 'customer'), upload.single('idImage'), asyncHandler(async (req, res) => {
    const id = await IdDocumentService.replaceDocument(req.user, req.params.id, req.file);
    res.status(200).json({ success: true, message: 'ID updated successfully.', id});
  })
);

router.delete( '/:id', protect, authorize('owner', 'customer'), asyncHandler(async (req, res) => {
    await IdDocumentService.removeDocument(req.user, req.params.id);
    res.status(200).json({ success: true, message: 'ID removed.'});
  })
);


router.get('/user/:userId', protect, authorize('admin'), asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, ids: await IdDocumentService.getByUserForAdmin(req.params.userId) });
}));



module.exports = router;