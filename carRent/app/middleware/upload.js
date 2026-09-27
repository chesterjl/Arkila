const multer = require('multer');
const ApiError = require('../utils/ApiError');

// Files stay in memory, then are streamed to Cloudinary (nothing saved on disk)
module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new ApiError(400, 'Only image files are allowed.'));
    cb(null, true);
  },
});
