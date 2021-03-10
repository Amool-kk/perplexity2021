const { Router } = require("express");
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

const router = Router();

router.get("/signup", isAuthenticated, signup_get);
router.post("/signup", signup_post);
router.get("/login", isAuthenticated, login_get);
router.post("/login", login_post);
router.get("/logout", requireAuth, logout_get);

module.exports = router;
