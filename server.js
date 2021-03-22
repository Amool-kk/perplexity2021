require("dotenv").config();
const express = require("express");
const http = require("http");
const socket = require("socket.io");
const mongoose = require("mongoose");
const passport = require("passport");
const cookieSession = require("cookie-session");
require("./passportSetup");
const authRoutes = require("./routes/authRoutes");
const questionRoutes = require("./routes/questionRoutes");
const {
  isAdmin,
  checkUser,
  requireAuth,
} = require("./middleware/authMiddleware");
const User = require("./models/User");
const Category = require("./models/Category");
const Question = require("./models/Question");

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// middleware
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const maxAge = 3 * 24 * 60 * 60;

app.use(
  cookieSession({
    secret: process.env.SECRET,
    maxAge: maxAge * 1000,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// view engine
app.set("view engine", "ejs");

// Socket setup
const io = socket(server);

// database connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then((result) =>
    server.listen(port, () =>
      console.log(`Server started at http://localhost:${port}`)
    )
  )
  .catch((err) => console.log(err));

let bids = [];

app.get("*", checkUser);
app.get("/", (req, res) => {
  res.render("home");
});

app.use(authRoutes);

app.get("/admin*", isAdmin);
app.use("/admin", questionRoutes);

app.get("/game", requireAuth, (req, res) => {
  res.render("game");
});

let bidPlayer;
let idx = 0;
// will track the round eliminate players after every 8 rounds
let roundNo = 1;

/////////////////////////////
// Sockets //
/////////////////////////////

let max = {
  amount: 0,
  player: null,
};

io.on("connection", (socket) => {
  console.log("Made Socket Connection: ", socket.id);
  // socket.emit("login", { name: rug.generate(), bids: bids });

  socket.on("start-game", async () => {
    console.log(idx);
    console.log("game started");
    const users = await User.find({ role: "user", eligible: true });
    bidPlayer = users[idx];
    console.log("Player currently being bid on", bidPlayer);
    io.sockets.emit("start", {
      bidPlayer,
    });
  });

  // Next round handling by the admin
  socket.on("next-round", async () => {
    const players = await Users.find({ role: "user", eligible: true });
    let tempPlayers = players;
    roundNo++;
    if (roundNo % 8 === 1) {
      // Eliminate the players
      
    }
    // update the leaderboard

    // choose the next player to be bid on
    idx++;
    if (idx === User.count({ role: "user", eligible: true })) {
      idx = 0;
    }
    bidPlayer = players[idx];
    console.log("Player currently being bid on", bidPlayer);
    io.sockets.emit("start", {
      bidPlayer,
    });
  });

  socket.on("bid", async (content) => {
    console.log("bid content", content);

    max =
      max.amount > content.amount
        ? max
        : {
            amount: content.amount,
            player: content.player,
            lastCategory: await User.findById(content.player.id).select(
              "lastCategory -_id"
            ),
          };
    console.log("max", max.lastCategory);
    io.sockets.emit("bid", { content, bidPlayer });
    bids.push(content);
  });

  socket.on("stop-bid", async () => {
    // Category Selection
    const categories = await Category.find({}).select("name -_id");
    console.log(categories);
    io.sockets.emit("category", { categories, bidPlayer, max });
  });

  let question;

  socket.on("chosenCategory", async ({ chosenCategory, currentPlayer }) => {
    console.log("they chose", chosenCategory);
    user = await User.findByIdAndUpdate(currentPlayer.id, {
      lastCategory: chosenCategory,
    });
    console.log("last", user.lastCategory);
    const question = await Question.findOne({
      category: chosenCategory,
      disabled: false,
    });
    console.log(question);
    io.sockets.emit("question", { question, bidPlayer, chosenCategory });
    question.disabled = true;
    question.save();
  });

  socket.on("answerGiven", async (correct) => {
    if (correct) {
      let bidder = await User.findByIdAndUpdate(bidPlayer._id, {
        $inc: {
          score: max.amount,
        },
      });
      let maxPlayer = await User.findByIdAndUpdate(max.player.id, {
        $inc: {
          score: -max.amount,
        },
      });
    } else {
      let bidder = await User.findByIdAndUpdate(bidPlayer._id, {
        $inc: {
          score: -max.amount,
        },
      });
      let maxPlayer = await User.findByIdAndUpdate(max.player.id, {
        $inc: {
          score: max.amount,
        },
      });
    }
    io.sockets.emit("roundEnd");
  });
});
