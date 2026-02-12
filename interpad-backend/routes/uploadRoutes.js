const express = require('express');
const multer = require('multer');
const path = require('path');
const { uploadImage, UPLOAD_DIR, MAX_SIZE, ALLOWED_MIMES } = require('../controllers/uploadController');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || path.extname(file.mimetype) || '.jpg';
    const safeExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, '');
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt || '.jpg'}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false); // multer nuk kalon skedarin; uploadController kthen 400 nëse nuk ka file
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter,
});

function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Skedari është shumë i madh. Maksimumi 5 MB.' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
}

router.post('/image', upload.single('image'), handleUploadError, uploadImage);

module.exports = router;
