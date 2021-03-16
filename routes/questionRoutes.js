const { Router } = require("express");

const {
  category_get,
  category_post,
  question_get,
  question_post,
} = require("../controllers/quesControllers");
const { isAdmin } = require("../middleware/authMiddleware");

const router = Router();

router.get("/category", isAdmin, category_get);
router.post("/category", category_post);
router.get("/question", question_get);
router.post("/question", question_post);

module.exports = router;
