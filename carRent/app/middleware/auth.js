const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/JwtUtil');

// Requires "Authorization: Bearer <token>"
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) throw new ApiError(401, 'Not authenticated. Token missing.');

  let decoded;
  try {
    decoded = verifyToken(header.split(' ')[1]);
  } catch (err) {
    throw new ApiError(401, err.name === 'TokenExpiredError' ? 'Token expired. Please login again.' : 'Invalid token.');
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new ApiError(401, 'User no longer exists.');

  req.user = user;
  next();
});

// Role-based access: authorize('owner'), authorize('customer'), ...
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action.'));
  }
  next();
};

module.exports = { protect, authorize };
