require("dotenv").config();
const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports.requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;

  // check for JWT and verifying

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        res.redirect("/login");
      } else {
        console.log(decodedToken);
        next();
      }
    });
  } else {
    res.redirect("/login");
  }
};

// Check current user
module.exports.checkUser = (req, res, next) => {
  const token = req.cookies.jwt;

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        res.locals.user = null;
        next();
      } else {
        let user = await User.findById(decodedToken.id);
        res.locals.user = user;
        next();
      }
    });
  } else {
    res.locals.user = null;
    next();
  }
};

// check if user is authenticated
module.exports.isAuthenticated = (req, res, next) => {
  const token = req.cookies.jwt;

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        next();
      } else {
        res.redirect("/");
      }
    });
  } else {
    next();
  }
};

// Check if user is admin
module.exports.isAdmin = (req, res, next) => {
  const token = req.cookies.jwt;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        res.redirect("/");
      } else {
        let user = await User.findById(decodedToken.id);
        if (user.role == "admin") {
          next();
        }
      }
    });
  } else {
    res.redirect("/");
  }
};
