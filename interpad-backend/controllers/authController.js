const bcrypt = require('bcrypt');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d';

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

      // 5. JWT token
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
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: userData,
        token,
      });
    } catch (error) {
      console.error('Login error:', error);
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
};

