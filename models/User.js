const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate");


const userSchema = mongoose.Schema({
  oauthID: String,
  name: String,
  profilePhoto: String,
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
  score: {
    type: Number,
    default: 0,
  },
  eligible: {
    type: Boolean,
    default: true,
  },
  lastCategory:{
    type: String,
    default: null
  }
});

// Fire a function after doc is saved to the db
userSchema.post("save", function (user, next) {
  console.log("New user created and saved", user);
  next();
});

userSchema.plugin(findOrCreate);

const User = mongoose.model("user", userSchema);

module.exports = User;
