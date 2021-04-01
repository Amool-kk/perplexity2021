const Category = require("../models/Category");
const { Question } = require("../models/Question");

module.exports.category_get = async (req, res) => {
  const categories = await Category.find({});
  // res.status(200).json(categories);
  res.render("category", { categories });
};

module.exports.category_post = async (req, res) => {
  const { name } = req.body;
  try {
    const category = await Category.create({ name });
    // res.status(201).json({ category });
    res.redirect("/admin/category");
  } catch (err) {
    console.log(err);
    res.status(400).json({ errors: err });
  }
};

module.exports.question_get = async (req, res) => {
  // const categories = await Category.find({});
  const questions = await Question.find({});
  const categories = await Category.find({}).select({ name: 1, _id: 0 });
  // res.status(200).json(questions);
  res.render("question", { questions, categories });
};

module.exports.question_post = async (req, res) => {
  const { text, answer, duration, category_name } = req.body;
  try {
    const question = await Question.create({
      text,
      answer,
      duration,
      category: category_name,
    });
    await Category.updateOne(
      { name: category_name },
      { $push: { questions: question } }
    );
    res.redirect("/admin/question");
    // res.status(201).json({ question });
  } catch (err) {
    console.log(err);
    res.status(400).json({ errors: err });
  }
};
