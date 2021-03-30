const mongoose = require("mongoose");
const { questionSchema } = require("./Question");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
  },
  questions: [questionSchema],
  disabledCount: {
    type: Number,
    default: 0,
  },
});

const Category = mongoose.model("category", categorySchema);

module.exports = Category;
