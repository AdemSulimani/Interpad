const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'images');
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

const useCloudinary =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (!useCloudinary && !fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

if (useCloudinary) {
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Ngarkon një skedar imazhi: në cloud (Cloudinary) nëse është konfiguruar,
 * përndryshe në uploads/images. Kthen URL-në e imazhit.
 */
function uploadImage(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Nuk u dërgua asnjë skedar. Dërgoni një imazh me fushën "image".',
    });
  }

  if (!ALLOWED_MIMES.includes(req.file.mimetype)) {
    if (req.file.path) fs.unlink(req.file.path, () => {});
    return res.status(400).json({
      success: false,
      message: 'Lloji i skedarit nuk lejohet. Përdorni JPEG, PNG, GIF, WebP ose SVG.',
    });
  }

  // Cloud storage (Cloudinary) – imazhi mbetet përgjithmonë, nuk fshihet pas restart
  if (useCloudinary && req.file.buffer) {
    const cloudinary = require('cloudinary').v2;
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    return cloudinary.uploader
      .upload(dataUri, {
        folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'interpad',
        resource_type: 'image',
      })
      .then((result) => {
        res.status(201).json({
          success: true,
          url: result.secure_url,
          filename: result.public_id,
        });
      })
      .catch((err) => {
        console.error('Cloudinary upload error', err);
        res.status(500).json({
          success: false,
          message: err.message || 'Ngarkimi në cloud dështoi.',
        });
      });
  }

  // Fallback: ruaj lokalisht (Render e fshin pas redeploy – përdor Cloudinary për prod)
  const url = `${req.protocol}://${req.get('host')}/uploads/images/${req.file.filename}`;
  res.status(201).json({
    success: true,
    url,
    filename: req.file.filename,
  });
}

module.exports = {
  uploadImage,
  UPLOAD_DIR,
  MAX_SIZE,
  ALLOWED_MIMES,
  useCloudinary,
};
