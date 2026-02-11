const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
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
      required: function() {
        // Password është i detyrueshëm vetëm nëse nuk është Google user
        return !this.googleId;
      },
      minlength: [6, 'Password must be at least 6 characters long'],
      // NOTE: Këtu ruajmë vetëm HASH-in e password-it, jo plain text
    },
    // Google OAuth fields
    googleId: {
      type: String,
      default: null,
      unique: true,
      sparse: true, // Lejon null values por garanton uniqueness për non-null values
    },
    isGoogleUser: {
      type: Boolean,
      default: false, // Për dallim midis Google users dhe email/password users
    },
    profilePicture: {
      type: String,
      default: null, // Foto nga Google profile
    },
    companyType: {
      type: String,
      default: null,
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
    // Token për reset password (hash)
    resetPasswordToken: {
      type: String,
      default: null,
    },
    // Koha kur skadon token-i për reset password (1 orë)
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt automatikisht
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;

