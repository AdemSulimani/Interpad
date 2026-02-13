require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Session configuration për OAuth flow
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS në production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 orë
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Global middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // E nevojshme për cookies/session
}));
app.use(express.json());

// Health check route (mundesh me testu shpejt)
app.get('/', (req, res) => {
  res.json({ message: 'Interpad backend is running 🚀' });
});

// Auth routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Upload routes (imazhe për dokumente)
const uploadRoutes = require('./routes/uploadRoutes');
app.use('/api/upload', uploadRoutes);

// Document routes (krijim, përditësim, load, lista recent)
const documentRoutes = require('./routes/documentRoutes');
app.use('/api/documents', documentRoutes);

// Shërbej skedarët e ngarkuar statikisht (URL për imazhet e ruajtura)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 handler për çdo route që nuk u gjet
app.use(notFound);

// Error handler qendror
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Lidhja me databazë para se me nis serverin
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});


