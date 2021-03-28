const mongoose = require("mongoose");

const bidSchema = mongoose.Schema({
  activePlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  bidPlayer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  timeEnd: Date,
  maxBid: Number,
  maxPlayer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

const Bid = mongoose.model("bid", bidSchema);

module.exports = Bid;