const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
  },
  questions: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
  },
});

const Category = mongoose.model("category", categorySchema);

module.exports = Category;
