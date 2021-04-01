const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  text: String,
  category: String,
  answer: String,
  disabled: { type: Boolean, default: false },
  duration: String,
});

const Question = mongoose.model("question", questionSchema);

module.exports = { Question, questionSchema };
