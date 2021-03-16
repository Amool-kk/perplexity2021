const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const isEmail = require("validator/lib/isEmail");

const userSchema = mongoose.Schema({
  email: {
    type: String,
    required: [true, "Please provide email"],
    unique: true,
    lowercase: true,
    validate: [isEmail, "Please enter a valid email"],
  },
  password: {
    type: String,
    required: [true, "Please provide password"],
    minlength: [8, "min password length is 8 characters"],
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
});

// Fire a function before user is saved to the db
userSchema.pre("save", async function (next) {
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Fire a function after doc is saved to the db
userSchema.post("save", function (user, next) {
  console.log("New user created and saved", user);
  next();
});

// Static method to login users
userSchema.statics.login = async function (email, password) {
  const user = await this.findOne({ email });
  if (user) {
    const auth = await bcrypt.compare(password, user.password);
    if (auth) return user;
    throw Error("Incorrect Password");
  }
  throw Error("Incorrect Email");
};

const User = mongoose.model("user", userSchema);

module.exports = User;
