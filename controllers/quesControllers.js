const Category = require("../models/Category");
const {Question} = require("../models/Question");

module.exports.category_get = async (req, res) => {
  const categories = await Category.find({});
  // res.status(200).json(categories);
  res.render("category", { categories });
};

module.exports.category_post = async (req, res) => {
  console.log(req.body);
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
  // res.status(200).json(questions);
  res.render("question", { questions });
};

module.exports.question_post = async (req, res) => {
  console.log(req.body);
  const { text, answer, points, duration, category_name } = req.body;
  try {
    const category = await Category.findOne({ name: category_name });
    const cid = category._id;
    const question = await Question.create({
      text,
      answer,
      points,
      duration,
      category: category_name,
    });
    await Category.updateOne({ _id: cid }, { $push: { questions: question } });
    res.redirect("/admin/question");
    // res.status(201).json({ question });
  } catch (err) {
    console.log(err);
    res.status(400).json({ errors: err });
  }
};
