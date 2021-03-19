require("dotenv").config();
const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports.requireAuth = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.redirect("/login");
  }
  const token = req.cookies.jwt;
};

// Check current user
module.exports.checkUser = (req, res, next) => {
  if (req.user) {
    res.locals.user = req.user;
    next();
  } else {
    res.locals.user = null;
    next();
  }
};

// check if user is authenticated
module.exports.isAuthenticated = (req, res, next) => {
  if (req.user) {
    res.redirect("/");
  } else {
    next();
  }
};

// module.exports.isAuthenticated = (req, res, next) => {
//   const token = req.cookies.jwt;

//   if (token) {
//     jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
//       if (err) {
//         console.log(err.message);
//         next();
//       } else {
//         res.redirect("/");
//       }
//     });
//   } else {
//     next();
//   }
// };

// Check if user is admin
module.exports.isAdmin = (req, res, next) => {
  if (req.user) {
    if (req.user.role == "admin") {
      next();
    } else {
      res.redirect("/");
    }
  } else {
    res.redirect("/");
  }
};
// module.exports.isAdmin = (req, res, next) => {
//   const token = req.cookies.jwt;
//   if (token) {
//     jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
//       if (err) {
//         console.log(err.message);
//         res.redirect("/");
//       } else {
//         let user = await User.findById(decodedToken.id);
//         console.log(user);
//         if (user.role == "admin") {
//           next();
//         } else res.redirect("/");
//       }
//     });
//   } else {
//     res.redirect("/");
//   }
// };
