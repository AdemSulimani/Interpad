const bcrypt = require('bcrypt');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendVerificationCodeEmail, sendPasswordResetEmail } = require('../services/emailService');

const SALT_ROUNDS = 10;
// Hapi 4 – Kohëzgjatje e ndryshme: remember me = më e gjatë, sesion = më e shkurtër
const JWT_EXPIRES_IN = '7d';       // kur përdoruesi zgjedh "remember me"
const SESSION_EXPIRES_IN = '24h';  // kur nuk zgjedh (sesion deri sa mbyllet browser)

module.exports = {
  // POST /api/auth/register
  register: async (req, res) => {
    try {
      const { name, email, password, confirmPassword } = req.body;

      // 1. Basic required checks
      if (!name || !email || !password || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required',
        });
      }

      // 2. Email validation
      if (!validator.isEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Email is not valid',
        });
      }

      // 3. Password length
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long',
        });
      }

      // 4. Password match
      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password and confirm password do not match',
        });
      }

      // 5. Check if email already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email is already in use',
        });
      }

      // 6. Hash password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // 7. Create user
      const user = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
      });

      // 8. Prepare response (mos kthe password-in)
      const userData = {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        user: userData,
      });
    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred on the server. Please try again later.',
      });
    }
  },

  // POST /api/auth/login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // 1. Basic required checks
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      // 2. Email validation (optional but useful)
      if (!validator.isEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Credentials are incorrect',
        });
      }

      // 3. Gjej user-in në databazë
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credentials are incorrect',
        });
      }

      // 4. Krahaso password-in
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Credentials are incorrect',
        });
      }

      // 5. Gjenero kodin 6-shifror të verifikimit
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // 6. Vendos kohën e skadimit të kodit (p.sh. +10 minuta)
      const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

      // 7. Ruaj kodin dhe kohën e skadimit te user-i
      user.verificationCode = verificationCode;
      user.verificationCodeExpires = verificationCodeExpires;
      user.isVerified = false;
      await user.save();

      // 8. Dërgo email me kodin e verifikimit
      try {
        await sendVerificationCodeEmail(user.email, verificationCode);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Opsionale: mund ta kthejmë error ose veç me njoftu që s'u dërgua emaili
        // Për momentin kthejmë error që user-i me provu prapë
        return res.status(500).json({
          success: false,
          message: 'Failed to send verification email. Please try again later.',
        });
      }

      // NOTE:
      // Këtu NUK po krijojmë JWT token ende.
      // Frontendi duhet ta thërrasë endpoint-in e verifikimit me këtë kod.

      return res.status(200).json({
        success: true,
        message: 'Login successful. Verification code sent.',
        requiresVerification: true,
        // opsionale: mund të kthesh edhe userId për përdorim në hapin e verifikimit
        userId: user._id,
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred on the server. Please try again later.',
      });
    }
  },

  // GET /api/auth/me – Hapi 3: verifikon JWT dhe kthen user-in (për validim token në frontend)
  me: async (req, res) => {
    try {
      // req.user vendoset nga verifyJWT middleware
      const user = await User.findById(req.user.id)
        .select('name email createdAt updatedAt')
        .lean();
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      return res.status(200).json({
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      console.error('Auth me error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred on the server. Please try again later.',
      });
    }
  },

  // POST /api/auth/verify-code
  verifyCode: async (req, res) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: 'Email and code are required',
        });
      }

      // Gjej user-in sipas email-it
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user || !user.verificationCode || !user.verificationCodeExpires) {
        return res.status(400).json({
          success: false,
          message: 'Verification code is invalid or has expired',
        });
      }

      // Kontrollo nëse kodi përputhet
      if (user.verificationCode !== code) {
        return res.status(400).json({
          success: false,
          message: 'Verification code is invalid',
        });
      }

      // Kontrollo nëse kodi ka skaduar
      if (user.verificationCodeExpires < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Verification code has expired',
        });
      }

      // Nëse është valid: fshij kodin dhe kohën e skadimit dhe shëno si verified
      user.verificationCode = null;
      user.verificationCodeExpires = null;
      user.isVerified = true;
      await user.save();

      // Krijo JWT token si te login
      const payload = {
        id: user._id,
        name: user.name,
        email: user.email,
      };

      // Hapi 4 – Përdor kohëzgjatje të ndryshme sipas rememberMe (dërguar nga frontend)
      const rememberMe = req.body.rememberMe === true;
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: rememberMe ? JWT_EXPIRES_IN : SESSION_EXPIRES_IN,
      });

      const userData = {
        ...payload,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return res.status(200).json({
        success: true,
        message: 'Verification successful',
        user: userData,
        token,
      });
    } catch (error) {
      console.error('Verify code error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred on the server. Please try again later.',
      });
    }
  },

  // POST /api/auth/resend-code
  resendVerificationCode: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      if (!validator.isEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Email is not valid',
        });
      }

      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Gjenero kod të ri dhe vendos kohën e skadimit
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

      user.verificationCode = verificationCode;
      user.verificationCodeExpires = verificationCodeExpires;
      user.isVerified = false;
      await user.save();

      try {
        await sendVerificationCodeEmail(user.email, verificationCode);
      } catch (emailError) {
        console.error('Failed to resend verification email:', emailError);
        return res.status(500).json({
          success: false,
          message: 'Failed to resend verification email. Please try again later.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Verification code resent successfully.',
      });
    } catch (error) {
      console.error('Resend verification code error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred on the server. Please try again later.',
      });
    }
  },

  // GET /api/auth/check-email/:email
  checkEmail: async (req, res) => {
    try {
      const { email } = req.params;

      if (!email || !validator.isEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Email is not valid',
        });
      }

      const existingUser = await User.findOne({ email: email.toLowerCase() });

      return res.status(200).json({
        success: true,
        exists: !!existingUser,
      });
    } catch (error) {
      console.error('Check email error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred on the server. Please try again later.',
      });
    }
  },

  // GET /api/auth/check-username/:username
  checkUsername: async (req, res) => {
    try {
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username is required',
        });
      }

      const existingUser = await User.findOne({ name: username });

      return res.status(200).json({
        success: true,
        exists: !!existingUser,
      });
    } catch (error) {
      console.error('Check username error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred on the server. Please try again later.',
      });
    }
  },

  // POST /api/auth/forgot-password
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      // 1. Kontrollo nëse email është i dërguar
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      // 2. Validimi i email-it
      if (!validator.isEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Email is not valid',
        });
      }

      // 3. Gjej user-in në databazë
      const user = await User.findOne({ email: email.toLowerCase() });
      
      // 4. Nëse user nuk ekziston, kthej përgjigje suksesi për siguri
      // (mos trego që email-i nuk ekziston për të shmangur email enumeration)
      if (!user) {
        return res.status(200).json({
          success: true,
          message: 'If the email exists, a password reset link has been sent.',
        });
      }

      // 5. Gjenero token unik 64 karaktere hex
      const resetToken = crypto.randomBytes(32).toString('hex');

      // 6. Hash-on token-in për të ruajtur në databazë
      const hashedToken = await bcrypt.hash(resetToken, SALT_ROUNDS);

      // 7. Vendos kohën e skadimit (1 orë)
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 orë

      // 8. Ruaj token-in hash dhe kohën e skadimit te user-i
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = resetTokenExpires;
      await user.save();

      // 9. Dërgo email me link
      try {
        await sendPasswordResetEmail(user.email, resetToken);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Nëse dërgimi i email-it dështon, pastro token-in
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();
        
        return res.status(500).json({
          success: false,
          message: 'Failed to send password reset email. Please try again later.',
        });
      }

      // 10. Kthej përgjigje suksesi
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred on the server. Please try again later.',
      });
    }
  },

  // POST /api/auth/reset-password
  resetPassword: async (req, res) => {
    try {
      const { token, password, confirmPassword } = req.body;

      // 1. Kontrollo nëse të gjitha fushat janë të dërguara
      if (!token || !password || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Token, password, and confirm password are required',
        });
      }

      // 2. Validimi i password-it
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long',
        });
      }

      // 3. Kontrollo nëse password-et përputhen
      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password and confirm password do not match',
        });
      }

      // 4. Gjej të gjithë user-at që kanë resetPasswordToken dhe token-i nuk ka skaduar
      const users = await User.find({
        resetPasswordToken: { $ne: null },
        resetPasswordExpires: { $gt: new Date() },
      });

      // 5. Gjej user-in me token-in që përputhet
      let user = null;
      for (const u of users) {
        const isTokenMatch = await bcrypt.compare(token, u.resetPasswordToken);
        if (isTokenMatch) {
          user = u;
          break;
        }
      }

      // 6. Nëse user nuk u gjet ose token-i ka skaduar
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token. Please request a new password reset link.',
        });
      }

      // 7. Hash-on password-in e ri
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // 8. Përditëso password-in dhe fshi token-in
      user.password = hashedPassword;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      // 9. Kthej përgjigje suksesi
      return res.status(200).json({
        success: true,
        message: 'Password has been reset successfully.',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred on the server. Please try again later.',
      });
    }
  },

  // GET /api/auth/google/callback
  // Ky funksion ekzekutohet pasi Passport të ketë autentifikuar user-in me Google
  googleCallback: async (req, res) => {
    try {
      // Profile info nga Google (nga passport strategy)
      const googleProfile = req.user;

      if (!googleProfile || !googleProfile.email) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const redirectUrl = `${frontendUrl}/auth/google/callback?success=false&error=Google authentication failed`;
        return res.redirect(redirectUrl);
      }

      const { googleId, name, email, profilePicture } = googleProfile;

      // Validim: kontrollo që email është i vlefshëm (edhe pse tashmë kontrollohet në passport)
      if (!validator.isEmail(email)) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const redirectUrl = `${frontendUrl}/auth/google/callback?success=false&error=Invalid email address`;
        return res.redirect(redirectUrl);
      }

      // 1. Kontrollo nëse email ekziston në databazë
      let user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        // 2. Nëse ekziston: kontrollo nëse ka password (nuk është Google user)
        // Nëse ka password, duhet të kërkojmë password për të lidhur llogarinë
        if (user.password && !user.googleId) {
          // User ka llogari me email/password, por nuk ka Google linked
          // Ruaj informacionin në session për të kërkuar password
          req.session.pendingGoogleLink = {
            googleId,
            email: email.toLowerCase(),
            name,
            profilePicture,
            userId: user._id.toString(),
          };
          
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          const redirectUrl = `${frontendUrl}/auth/google/link-account?email=${encodeURIComponent(email)}`;
          return res.redirect(redirectUrl);
        }

        // Nëse user tashmë ka googleId ose nuk ka password, lidh automatikisht
        if (!user.googleId) {
          user.googleId = googleId;
          user.isGoogleUser = true; // Vendos si Google user
          if (profilePicture) {
            user.profilePicture = profilePicture;
          }
          await user.save();
        } else if (profilePicture && !user.profilePicture) {
          // Përditëso profile picture nëse nuk ka
          user.profilePicture = profilePicture;
          if (!user.isGoogleUser) {
            user.isGoogleUser = true; // Sigurohu që është shënuar si Google user
          }
          await user.save();
        }

        // Krijo JWT token dhe kthe të dhënat e userit (si në login normal)
        const payload = {
          id: user._id,
          name: user.name,
          email: user.email,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
          expiresIn: JWT_EXPIRES_IN,
        });

        const userData = {
          ...payload,
          profilePicture: user.profilePicture,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };

        // Encode user data si JSON string për URL
        const userDataEncoded = encodeURIComponent(JSON.stringify(userData));

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const redirectUrl = `${frontendUrl}/auth/google/callback?token=${token}&success=true&user=${userDataEncoded}`;

        return res.redirect(redirectUrl);
      } else {
        // 3. Nëse nuk ekziston: krijo user të ri me të dhënat nga Google
        user = await User.create({
          name,
          email: email.toLowerCase(),
          googleId,
          isGoogleUser: true, // Për dallim midis Google users dhe email/password users
          profilePicture,
          isVerified: true, // Google verifikon email, prandaj isVerified: true
          companyType: null, // Vendos si null ose default (mund të kërkohet më vonë)
          // password nuk është i detyrueshëm për Google users
        });

        // Krijo JWT token dhe kthe të dhënat e userit
        const payload = {
          id: user._id,
          name: user.name,
          email: user.email,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
          expiresIn: JWT_EXPIRES_IN,
        });

        const userData = {
          ...payload,
          profilePicture: user.profilePicture,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };

        // Encode user data si JSON string për URL
        const userDataEncoded = encodeURIComponent(JSON.stringify(userData));

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const redirectUrl = `${frontendUrl}/auth/google/callback?token=${token}&success=true&user=${userDataEncoded}`;

        return res.redirect(redirectUrl);
      }
    } catch (error) {
      console.error('Google callback error:', error);
      
      // Error handling: trajto refuzimet e Google ose gabimet e serverit
      let errorMessage = 'Authentication failed';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'ValidationError') {
        errorMessage = 'Invalid user data';
      } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        errorMessage = 'Database error occurred';
      }
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/google/callback?success=false&error=${encodeURIComponent(errorMessage)}`;
      return res.redirect(redirectUrl);
    }
  },

  // POST /api/auth/google/link-account
  // Lidh Google account me llogari ekzistuese me password
  linkGoogleAccount: async (req, res) => {
    try {
      const { email, password } = req.body;
      const sessionData = req.session.pendingGoogleLink;

      if (!sessionData) {
        return res.status(400).json({
          success: false,
          message: 'No pending Google account link found. Please try again.',
        });
      }

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      // Kontrollo nëse email përputhet me session
      if (email.toLowerCase() !== sessionData.email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Email does not match pending account',
        });
      }

      // Gjej user-in
      const user = await User.findById(sessionData.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Kontrollo password-in
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password',
        });
      }

      // Lidh Google account me user
      user.googleId = sessionData.googleId;
      user.isGoogleUser = true;
      if (sessionData.profilePicture) {
        user.profilePicture = sessionData.profilePicture;
      }
      await user.save();

      // Pastro session
      delete req.session.pendingGoogleLink;

      // Krijo JWT token
      const payload = {
        id: user._id,
        name: user.name,
        email: user.email,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
      });

      const userData = {
        ...payload,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      // Encode user data si JSON string për URL
      const userDataEncoded = encodeURIComponent(JSON.stringify(userData));

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/google/callback?token=${token}&success=true&user=${userDataEncoded}`;

      // Kthej redirect URL si JSON për frontend
      return res.json({
        success: true,
        redirectUrl,
        token,
        user: userData,
      });
    } catch (error) {
      console.error('Link Google account error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while linking Google account',
      });
    }
  },
};

