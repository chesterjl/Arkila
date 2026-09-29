// UserService.js
const mongoose = require('mongoose');
const User = require('../models/User');
const IdDocumentService = require('./IdDocumentService');
const ApiError = require('../utils/ApiError');
const { ROLES, PUBLIC_ROLES, ID_LIMITS } = require('../config/constants');
const { generateToken } = require('../utils/JwtUtil');

const authResponse = (user) => ({ token: generateToken(user), expiresIn: process.env.JWT_EXPIRES_IN || '1d', user });

const register = async (body, files) => {
  const { name, email, password, phone, address, brandName } = body;
  const role = body.role || ROLES.CUSTOMER;

  if (!PUBLIC_ROLES.includes(role)) throw new ApiError(400, 'Role must be "customer" or "owner".');
  if (await User.findOne({ email: (email || '').toLowerCase() })) throw new ApiError(409, 'Email is already registered.');

  const idFiles = files?.idImages || [];
  if (role === ROLES.OWNER) {
    if (idFiles.length < 1) throw new ApiError(400, 'Car owners must upload at least 1 ID (max 2) in "idImages".');
    if (idFiles.length > ID_LIMITS.owner) throw new ApiError(400, `Car owners can upload up to ${ID_LIMITS.owner} IDs.`);
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    address,
    role,
    brandName: role === ROLES.OWNER ? brandName || name : undefined,
    ownerStatus: role === ROLES.OWNER ? 'pending' : undefined,
  });

  if (role === ROLES.OWNER) {
    try {
      await IdDocumentService.addDocuments(user, idFiles);
    } catch (err) {
      await User.findByIdAndDelete(user._id);
      throw err;
    }
  }

  return authResponse(user);
};

const login = async ({ email, password }) => {
  if (!email || !password) throw new ApiError(400, 'Email and password are required.');
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, 'Invalid email or password.');
  return authResponse(user);
};

const updateInfo = async (user, body) => {
  const { name, email, phone, address, brandName } = body;
  if (
    name === undefined &&
    phone === undefined &&
    email === undefined &&
    address === undefined &&
    brandName === undefined
  ) {
    throw new ApiError(400, 'Nothing to update. Provide at least one of: name, phone, email, address, brandName.');
  }

  if (email !== undefined && email.toLowerCase() !== user.email) {
    if (await User.findOne({ email: email.toLowerCase() })) throw new ApiError(409, 'Email is already registered.');
    user.email = email.toLowerCase();
  }

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (address !== undefined) user.address = address;

  if (brandName !== undefined) {
    if (user.role !== ROLES.OWNER) throw new ApiError(400, 'Only car owners have a brand name.');
    user.brandName = brandName;
  }

  await user.save();
  return user;
};

const changePassword = async (reqUser, body) => {
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current password and new password are required.');
  }

  const user = await User.findById(reqUser._id).select('+password');
  if (!user) throw new ApiError(404, 'User not found.');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new ApiError(400, 'Incorrect current password.');

  user.password = newPassword;
  await user.save();
  return true;
};

const getAllUsers = async (queryRole) => {
  const filter = {};
  if (queryRole && Object.values(ROLES).includes(queryRole)) {
    filter.role = queryRole;
  }
  return User.find(filter).sort({ createdAt: -1 });
};

const getPendingOwners = async () => {
  return User.find({ role: ROLES.OWNER, ownerStatus: 'pending' }).sort({ createdAt: -1 });
};

const approveOwner = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found.');
  if (user.role !== ROLES.OWNER) throw new ApiError(400, 'User is not a car owner.');

  user.ownerStatus = 'approved';
  user.rejectionReason = undefined;
  await user.save();
  return user;
};

const rejectOwner = async (userId, reason) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found.');
  if (user.role !== ROLES.OWNER) throw new ApiError(400, 'User is not a car owner.');

  user.ownerStatus = 'rejected';
  user.rejectionReason = reason || 'Your owner application was rejected by the administrator.';
  await user.save();
  return user;
};

const buildAdmin = async ({ name, email, password, phone, address }) => {
  if (!name || !email || !password || !phone || !address) {
    throw new ApiError(400, 'name, email, password, phone and address are required.');
  }
  if (await User.findOne({ email: email.toLowerCase() })) throw new ApiError(409, 'Email is already registered.');
  return User.create({ name, email, password, phone, address, role: ROLES.ADMIN });
};

const bootstrapFirstAdmin = async (body) => {
  if (await User.exists({ role: ROLES.ADMIN })) {
    throw new ApiError(403, 'An admin account already exists. Ask an existing admin to create yours.');
  }
  const user = await buildAdmin(body);
  return authResponse(user);
};

const createAdmin = async (body) => {
  const user = await buildAdmin(body);
  return { user };
};

const assertUserId = (id) => {
  if (typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id) || !mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid user id.');
};

// Admin: suspend a customer or owner account. Admin accounts can never be suspended (this also blocks self-suspension).
const suspendUser = async (userId, reason) => {
  assertUserId(userId);
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found.');
  if (user.role === ROLES.ADMIN) throw new ApiError(403, 'Admin accounts cannot be suspended.');
  if (user.isSuspended) throw new ApiError(400, 'Account is already suspended.');
  if (reason !== undefined && reason !== null && typeof reason !== 'string') throw new ApiError(400, 'reason must be text.');
  const text = (reason || '').trim();
  if (text.length > 500) throw new ApiError(400, 'reason must be at most 500 characters.');

  user.isSuspended = true;
  user.suspensionReason = text || 'Suspended by an administrator.';
  user.suspendedAt = new Date();
  await user.save();
  return user;
};

const reactivateUser = async (userId) => {
  assertUserId(userId);
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found.');
  if (!user.isSuspended) throw new ApiError(400, 'Account is not suspended.');

  user.isSuspended = false;
  user.suspensionReason = undefined;
  user.suspendedAt = undefined;
  await user.save();
  return user;
};

module.exports = {
  suspendUser,
  reactivateUser,
  register,
  login,
  updateInfo,
  changePassword,
  bootstrapFirstAdmin,
  createAdmin,
  getAllUsers,
  getPendingOwners,
  approveOwner,
  rejectOwner,
};