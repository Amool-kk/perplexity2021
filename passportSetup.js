require("dotenv").config();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const User = require("./models/User");

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findOne({ _id: id }, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.DOMAIN_NAME}/auth/google/complete`,
    },
    function (accessToken, refreshToken, profile, done) {
      User.findOrCreate(
        {
          oauthID: profile.id,
          name: `${profile.name.givenName} ${profile.name.familyName}`,
          profilePhoto: profile.photos[0].value,
        },
        function (err, user) {
          return done(err, user);
        }
      );
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.DOMAIN_NAME}/auth/github/complete`,
    },
    function (accessToken, refreshToken, profile, done) {
      User.findOrCreate(
        {
          oauthID: profile.id,
          name: profile.displayName,
          profilePhoto: profile.photos[0].value,
        },
        function (err, user) {
          return done(err, user);
        }
      );
    }
  )
);
