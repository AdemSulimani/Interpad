const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Konfigurimi i Google OAuth Strategy
// GOOGLE_CALLBACK_URL duhet të jetë absolute URL (p.sh. http://localhost:5000/api/auth/google/callback)
// Nëse GOOGLE_CALLBACK_URL nuk është definuar, përdoret BACKEND_URL ose fallback localhost:5000
const callbackURL = process.env.GOOGLE_CALLBACK_URL || 
  `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: callbackURL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Merr profile info nga Google dhe ktheje te callback për procesim
        const { id: googleId, displayName: name, emails, photos } = profile;
        const email = emails && emails[0] ? emails[0].value : null;
        const profilePicture = photos && photos[0] ? photos[0].value : null;

        // Validim: kontrollo që email nga Google është i vlefshëm
        if (!email) {
          return done(new Error('Email not provided by Google'), null);
        }

        // Validim i email-it me validator
        const validator = require('validator');
        if (!validator.isEmail(email)) {
          return done(new Error('Invalid email address from Google'), null);
        }

        // Kthe profile info te callback për procesim të plotë
        // Logjika e kontrollimit dhe krijimit të user-it do të jetë në callback
        return done(null, {
          googleId,
          name,
          email: email.toLowerCase(),
          profilePicture,
        });
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

// Serializimi i user-it për session (nëse përdorim session)
passport.serializeUser((user, done) => {
  // Nëse user ka _id (MongoDB document), serializo me _id
  if (user._id) {
    done(null, user._id.toString());
  } 
  // Nëse user është plain object nga Google (nuk ka _id ende), serializo me email
  else if (user.email) {
    done(null, `email:${user.email}`);
  } 
  // Fallback: serializo me googleId nëse ekziston
  else if (user.googleId) {
    done(null, `google:${user.googleId}`);
  } 
  else {
    done(new Error('Cannot serialize user: missing _id, email, or googleId'), null);
  }
});

// Deserializimi i user-it nga session
passport.deserializeUser(async (id, done) => {
  try {
    let user = null;
    
    // Nëse id fillon me "email:", gjej user me email
    if (id.startsWith('email:')) {
      const email = id.replace('email:', '');
      user = await User.findOne({ email: email.toLowerCase() });
    }
    // Nëse id fillon me "google:", gjej user me googleId
    else if (id.startsWith('google:')) {
      const googleId = id.replace('google:', '');
      user = await User.findOne({ googleId });
    }
    // Përndryshe, supozojmë që është MongoDB ObjectId
    else {
      user = await User.findById(id);
    }
    
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;

