const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  text:String,
  category: String,
  answer: String,
  points: { type: Number, default: 100 },
  disabled: { type: Boolean, default: false },
  duration: String,
});

const Question = mongoose.model("question", questionSchema);

module.exports = { Question, questionSchema };
