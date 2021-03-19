const { Router } = require("express");
const passport = require("passport");

const { requireAuth } = require("../middleware/authMiddleware");

const router = Router();

// router.get("/signup", isAuthenticated, signup_get);
// router.post("/signup", signup_post);
// router.get("/login", isAuthenticated, login_get);
// router.post("/login", login_post);

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

router.get(
  "/auth/google/complete",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home / game
    res.redirect("/game");
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
    res.redirect("/game");
  }
);

router.get("/login", (req, res) => {
  res.render("login");
});

router.get("/logout", requireAuth, (req, res) => {
  console.log(req.session);
  req.session = null;
  req.logout();
  res.redirect("/");
});

module.exports = router;
