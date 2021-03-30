const mongoose = require("mongoose");

const bidSchema = mongoose.Schema({
  // activePlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  bidPlayer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  bidTimeEnd: Date,
  catetoryTimeEnd: Date,
  answerTimeLeft: Date,
  maxBid: Number,
  maxPlayer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  bidHistory: [
    {
      name: String,
      amount: Number,
    },
  ],
  chosenCategory: {
    type: String,
    default: "",
  },
});

const Bid = mongoose.model("bid", bidSchema);

module.exports = Bid;
