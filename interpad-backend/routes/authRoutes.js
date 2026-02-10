// Rrugët për /register, /login, /me, etj.
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { loginRateLimiter, verifyCodeRateLimiter } = require('../middleware/authMiddleware');

// REGISTER
router.post('/register', authController.register);

// LOGIN (me rate limiting)
router.post('/login', loginRateLimiter, authController.login);

// VERIFY CODE pas login-it (me rate limiting për tentativat e kodit)
router.post('/verify-code', verifyCodeRateLimiter, authController.verifyCode);

// RESEND VERIFICATION CODE
router.post('/resend-code', authController.resendVerificationCode);

// OPTIONAL: Check if email already exists
router.get('/check-email/:email', authController.checkEmail);

// OPTIONAL: Check if username already exists
router.get('/check-username/:username', authController.checkUsername);

module.exports = router;

