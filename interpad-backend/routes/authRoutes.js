// Rrugët për /register, /login, /me, etj.
const express = require('express');
const router = express.Router();
const passport = require('passport');

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

// FORGOT PASSWORD
router.post('/forgot-password', authController.forgotPassword);

// RESET PASSWORD
router.post('/reset-password', authController.resetPassword);

// OPTIONAL: Check if email already exists
router.get('/check-email/:email', authController.checkEmail);

// OPTIONAL: Check if username already exists
router.get('/check-username/:username', authController.checkUsername);

// GOOGLE OAUTH ROUTES
// Route 1: Fillon OAuth flow (ridrejton te Google)
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'], // Kërko profile dhe email nga Google
  })
);

// Route 2: Merr përgjigjen nga Google pas autentifikimit
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/auth/google/callback?success=false&error=Authentication failed`
      : 'http://localhost:5173/auth/google/callback?success=false&error=Authentication failed',
    session: true, // Përdorim session për OAuth flow
  }),
  authController.googleCallback
);

// Route 3: Lidh Google account me llogari ekzistuese
router.post('/google/link-account', authController.linkGoogleAccount);

module.exports = router;

