require('dotenv').config();
const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());

// Health check route (mundesh me testu shpejt)
app.get('/', (req, res) => {
  res.json({ message: 'Interpad backend is running 🚀' });
});

// Auth routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

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


