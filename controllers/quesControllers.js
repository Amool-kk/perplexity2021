const Question = require("../models/Question");
const Category = require("../models/Category");

module.exports.category_get = async (req, res) => {
  // res.render("category");
  const categories = await Category.find({});
  res.status(200).json(categories);
};

module.exports.category_post = async (req, res) => {
  const { name } = req.body;
  try {
    const category = await Category.create({ name });
    res.status(201).json({ category });
  } catch (err) {
    console.log(err);
    res.status(400).json({ errors: err });
  }
};

module.exports.question_get = async (req, res) => {
  // const categories = await Category.find({});
  const questions = await Question.find({});
  res.status(200).json(questions);
  // res.render("question", { categories });
};

module.exports.question_post = async (req, res) => {
  const { text, answer, points, duration, category_name } = req.body;
  try {
    const category = await Category.findOne({ name: category_name });
    const cid = category._id;
    console.log(cid);
    const question = await Question.create({
      text,
      answer,
      points,
      duration,
      category: cid,
    });
    await Category.updateOne(
      { _id: cid },
      { $push: { questions: question } }
    );
    res.status(201).json({ question });
  } catch (err) {
    console.log(err);
    res.status(400).json({ errors: err });
  }
};
