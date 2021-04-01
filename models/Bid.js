const mongoose = require("mongoose");

const bidSchema = mongoose.Schema({
  // activePlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  bidPlayer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  bidTimeEnd: Date,
  catetoryTimeEnd: Date,
  answerTimeEnd: Date,
  roundEnd: Date,
  maxBid: Number,
  maxPlayer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  stopped: {
    type: Boolean,
    default: false,
  },
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
