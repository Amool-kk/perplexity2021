const { Router } = require("express");
const passport = require("passport");
const {
  signup_get,
  signup_post,
  login_get,
  login_post,
  logout_get,
} = require("../controllers/authControllers");

const {
  isAuthenticated,
  requireAuth,
} = require("../middleware/authMiddleware");

const User = require("../models/User");

const router = Router();

router.get("/signup", isAuthenticated, signup_get);
router.post("/signup", signup_post);
router.get("/login", isAuthenticated, login_get);
router.post("/login", login_post);
// router.get("/logout", requireAuth, logout_get);

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

router.get(
  "/auth/google/complete",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home / game
    res.redirect("/");
  }
);

router.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["profile"] })
);

router.get(
  "/auth/github/complete",
  passport.authenticate("github", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home / game.
    res.redirect("/");
  }
);

router.get("/logout", (req, res) => {
  req.session = null;
  req.logout();
  res.redirect("/");
});

module.exports = router;
