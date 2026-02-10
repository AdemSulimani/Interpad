const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Name must be at least 3 characters long'],
      maxlength: [50, 'Name must be at most 50 characters long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => validator.isEmail(value),
        message: 'Invalid email address',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      // NOTE: Këtu ruajmë vetëm HASH-in e password-it, jo plain text
    },
    // Kodi 6-shifror për verifikim pas login/register
    verificationCode: {
      type: String,
      default: null,
    },
    // Koha kur skadon kodi i verifikimit (p.sh. pas 10 minutave)
    verificationCodeExpires: {
      type: Date,
      default: null,
    },
    // A është verifikuar përdoruesi me kod (opsionale)
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt automatikisht
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;

