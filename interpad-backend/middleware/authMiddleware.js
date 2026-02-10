// Middleware për autentikim / validim do të shtohet këtu
// p.sh. verifyJWT, validateRequest, rate limiting, etj.

const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Rate limiter për tentativat e login-it
// p.sh. maksimumi 5 tentativa në 15 minuta nga e njëjta IP
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter për tentativat e verify-code
// p.sh. maksimumi 5 tentativa në 15 minuta nga e njëjta IP
const verifyCodeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 5,
  message: {
    success: false,
    message: 'Too many verification attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware për verifikimin e JWT token-it
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'You are not authorized',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, name, ... }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Session has expired or token is invalid',
    });
  }
}

module.exports = {
  loginRateLimiter,
  verifyCodeRateLimiter,
  verifyJWT,
};

