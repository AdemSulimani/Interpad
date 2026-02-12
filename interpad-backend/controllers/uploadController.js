const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'images');
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

// Sigurohu që dosja uploads/images ekziston
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Ngarkon një skedar imazhi, e ruan në uploads/images dhe kthen URL-në.
 * Thirret nga POST /api/upload/image me multipart/form-data, fusha "image".
 */
function uploadImage(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Nuk u dërgua asnjë skedar. Dërgoni një imazh me fushën "image".',
    });
  }

  if (!ALLOWED_MIMES.includes(req.file.mimetype)) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({
      success: false,
      message: 'Lloji i skedarit nuk lejohet. Përdorni JPEG, PNG, GIF, WebP ose SVG.',
    });
  }

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
};
