const mongoose = require("mongoose");
const { userSchema } = require("./User");

const bidSchema = mongoose.Schema({
  activePlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  bidPlayer: userSchema,
  timeEnd: Date,
  maxBid: Number,
  maxPlayer: userSchema,
  bidHistory: [
    {
      name: String,
      amount: Number,
    },
  ],
});

const Bid = mongoose.model("bid", bidSchema);

module.exports = Bid;
