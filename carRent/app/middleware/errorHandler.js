const multer = require('multer');

const notFound = (req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Server error';

  if (err instanceof multer.MulterError) {
    status = 400;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'Image is too large (max 5MB).';
    else if (err.code === 'LIMIT_UNEXPECTED_FILE') message = `Too many files or wrong field name: ${err.field}`;
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    message = 'Duplicate value: ' + Object.keys(err.keyValue).join(', ') + ' already exists.';
  }

  if (status === 500) console.error(err);
  res.status(status).json({ success: false, message });
};

module.exports = { notFound, errorHandler };
