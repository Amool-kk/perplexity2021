const { Router } = require("express");

const {
  category_get,
  category_post,
  question_get,
  question_post,
} = require("../controllers/quesControllers");

const router = Router();

router.get("/category", category_get);
router.post("/category", category_post);
router.get("/question", question_get);
router.post("/question", question_post);
router.get("/", (req, res) => {
  res.render("admin");
});

module.exports = router;
