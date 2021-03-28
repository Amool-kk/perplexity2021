const mongoose = require("mongoose");
const { questionSchema } = require("./Question");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
  },
  questions: [questionSchema],
});

const Category = mongoose.model("category", categorySchema);

module.exports = Category;
