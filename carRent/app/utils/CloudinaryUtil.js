const cloudinary = require('../config/cloudinary');

// Upload an in-memory buffer (from multer) to Cloudinary.
// Returns only what we store: { imageUrl, imagePublicId }
const uploadBuffer = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: 'image' }, (err, result) => {
      if (err) return reject(err);
      resolve({ imageUrl: result.secure_url, imagePublicId: result.public_id });
    });
    stream.end(buffer);
  });

const deleteImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete failed:', err.message);
  }
};

module.exports = { uploadBuffer, deleteImage };
