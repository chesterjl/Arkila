const mongoose = require('mongoose');

// Verification record: one uploaded ID image (Cloudinary).
// Owner: up to 2 (uploaded at registration). Customer: 1 (uploaded on first booking).
const idDocumentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    idType: { type: String, trim: true, default: 'Government ID' }, // e.g. "Driver's License", "Passport"
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String, required: true }, // Cloudinary id
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IdDocument', idDocumentSchema);
