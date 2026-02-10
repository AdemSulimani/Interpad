const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URL;

if (!mongoUri) {
  throw new Error('MONGODB_URL is not defined in .env');
}

async function connectDB() {
  try {
    await mongoose.connect(mongoUri, {
      // Mongoose 9 uses modern defaults; options can be customized here if needed
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

module.exports = connectDB;


