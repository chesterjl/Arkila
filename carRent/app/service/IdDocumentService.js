const mongoose = require('mongoose');
const IdDocument = require('../models/IdDocument');
const ApiError = require('../utils/ApiError');
const { ID_LIMITS } = require('../config/constants');
const { uploadBuffer, deleteImage } = require('../utils/CloudinaryUtil');

// Strict 24-hex check. Also blocks objects like { $ne: null } from reaching a query (NoSQL injection).
const assertId = (value, label = 'id') => {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value) || !mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `Invalid ${label}.`);
  }
};

// An owner whose IDs changed goes back to the admin review queue.
//  - includeApproved = true  (an ID was REPLACED): approved owners are re-checked too, otherwise someone
//    could get approved with a real ID and then swap in a fake one.
//  - includeApproved = false (an ID was ADDED): only rejected owners are re-submitted.
const reopenOwnerReview = async (user, { includeApproved }) => {
  if (user.role !== 'owner') return;
  const shouldReset = user.ownerStatus === 'rejected' || (includeApproved && user.ownerStatus === 'approved');
  if (!shouldReset) return;
  user.ownerStatus = 'pending';
  user.rejectionReason = undefined;
  await user.save();
};

const getByUser = (userId) => IdDocument.find({ user: userId }).sort({ createdAt: 1 });

// Admin: view any user's ID documents (owner verification page).
const getByUserForAdmin = async (userId) => {
  assertId(userId, 'user id');
  return IdDocument.find({ user: userId }).sort({ createdAt: 1 });
};

const addDocuments = async (user, files) => {
  if (!files || files.length === 0) throw new ApiError(400, 'At least one ID image is required.');

  const limit = ID_LIMITS[user.role];
  const existing = await IdDocument.countDocuments({ user: user._id });
  if (existing + files.length > limit) {
    throw new ApiError(400, `A ${user.role} can only have up to ${limit} ID image(s) on file (currently ${existing}).`);
  }

  const uploaded = [];
  let created;
  try {
    for (const file of files) uploaded.push(await uploadBuffer(file.buffer, 'carrent/ids'));
    created = await IdDocument.insertMany(uploaded.map((u) => ({ user: user._id, ...u })));
  } catch (err) {
    await Promise.all(uploaded.map((u) => deleteImage(u.imagePublicId))); // don't leave orphan images
    throw err;
  }

  await reopenOwnerReview(user, { includeApproved: false });
  return created;
};

const replaceDocument = async (user, docId, file) => {
  assertId(docId, 'ID id');
  const doc = await IdDocument.findOne({ _id: docId, user: user._id });
  if (!doc) throw new ApiError(404, 'ID not found.');
  if (!file) throw new ApiError(400, 'A new ID image is required.');

  const oldPublicId = doc.imagePublicId;
  const uploaded = await uploadBuffer(file.buffer, 'carrent/ids');

  try {
    doc.imageUrl = uploaded.imageUrl;
    doc.imagePublicId = uploaded.imagePublicId;
    await doc.save();
  } catch (err) {
    await deleteImage(uploaded.imagePublicId); // save failed: drop the new upload
    throw err;
  }

  await deleteImage(oldPublicId); // only after the record points at the new image
  await reopenOwnerReview(user, { includeApproved: true });
  return doc;
};

const removeDocument = async (user, docId) => {
  assertId(docId, 'ID id');
  const doc = await IdDocument.findOne({ _id: docId, user: user._id });
  if (!doc) throw new ApiError(404, 'ID not found.');

  const remaining = await IdDocument.countDocuments({ user: user._id });
  if (user.role === 'owner' && remaining <= 1) throw new ApiError(400, 'An owner must keep at least one ID on file.');

  await deleteImage(doc.imagePublicId);
  await doc.deleteOne();
};

module.exports = { getByUser, getByUserForAdmin, addDocuments, replaceDocument, removeDocument };