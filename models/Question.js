const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  text: String,
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },
  answer: String,
  points: { type: Number, default: 100 },
  disabled: { type: Boolean, default: false },
  duration: String,
});

const Question = mongoose.model("question", questionSchema);

module.exports = Question;
