const IdDocument = require('../models/IdDocument');
const ApiError = require('../utils/ApiError');
const { ID_LIMITS } = require('../config/constants');
const { uploadBuffer, deleteImage } = require('../utils/CloudinaryUtil');

const getByUser = (userId) => IdDocument.find({ user: userId }).sort({ createdAt: 1 });

const addDocuments = async (user, files, idType) => {
  if (!files || files.length === 0) throw new ApiError(400, 'At least one ID image is required.');

  const limit = ID_LIMITS[user.role];
  const existing = await IdDocument.countDocuments({ user: user._id });
  if (existing + files.length > limit) {
    throw new ApiError(400, `A ${user.role} can only have up to ${limit} ID image(s) on file (currently ${existing}).`);
  }

  const uploaded = [];
  try {
    for (const file of files) uploaded.push(await uploadBuffer(file.buffer, 'carrent/ids'));
    return await IdDocument.insertMany(uploaded.map((u) => ({ user: user._id, idType, ...u })));
  } catch (err) {
    await Promise.all(uploaded.map((u) => deleteImage(u.imagePublicId))); // don't leave orphan images
    throw err;
  }
};

const removeDocument = async (user, docId) => {
  const doc = await IdDocument.findOne({ _id: docId, user: user._id });
  if (!doc) throw new ApiError(404, 'ID not found.');

  const remaining = await IdDocument.countDocuments({ user: user._id });
  if (user.role === 'owner' && remaining <= 1) throw new ApiError(400, 'An owner must keep at least one ID on file.');

  await deleteImage(doc.imagePublicId);
  await doc.deleteOne();
};

module.exports = { getByUser, addDocuments, removeDocument };
