const jwt = require('jsonwebtoken');

// Token payload = who the user is (id + role). Expiry comes from JWT_EXPIRES_IN.
const generateToken = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

// Throws if invalid or expired
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = { generateToken, verifyToken };
