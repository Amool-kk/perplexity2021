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
const { findOneAndUpdate } = require("./models/User");

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

let noOfPlayers;

/////////////////////////////
// Sockets //
/////////////////////////////

let max = {
  amount: 0,
  player: null,
};

const startRound = async () => {
  console.log(idx);

  max.amount = 0;
  max.player = null;

  console.log("game started");
  const users = await User.find({ role: "user", eligible: true });
  bidPlayer = users[idx];
  console.log("Player currently being bid on", bidPlayer);
  io.sockets.emit("start", {
    bidPlayer,
  });
};

const updateLeaderBoard = async () => {
  const players = await User.find({ role: "user", eligible: true })
    .sort({ score: -1 })
    .select({
      name: 1,
      profilePhoto: 1,
      score: 1,
    });
  io.sockets.emit("updateBoard", { players });
};

io.on("connection", (socket) => {
  console.log("Made Socket Connection: ", socket.id);
  // socket.emit("login", { name: rug.generate(), bids: bids });

  socket.on("start-game", async () => {
    noOfPlayers = await User.count({ role: "user", eligible: true });
    console.log("count", noOfPlayers);
    updateLeaderBoard();
    startRound();
  });

  // Next round handling by the admin
  socket.on("next-round", async () => {
    roundNo++;
    if (roundNo % 8 === 1) {
      // Eliminate the players
      lastPlayers = await User.find({ role: "user", eligible: true }).sort({
        score: -1,
      });
      await User.findByIdAndUpdate(lastPlayers[0]._id, {
        $set: {
          eligible: false,
        },
      });
      await User.findByIdAndUpdate(lastPlayers[1]._id, {
        $set: {
          eligible: false,
        },
      });
    }

    // update the leaderboard
    updateLeaderBoard();

    // choose the next player to be bid on
    startRound();
  });

  socket.on("bid", async (content) => {
    // console.log("bid content", content);
    console.log("amounts", max.amount, content.amount);
    console.log("max greater", max.amount > content.amount);
    max =
      parseInt(max.amount) > parseInt(content.amount)
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
    // console.log("last", user.lastCategory);
    try {
      const questions = await Category.find({
        name: chosenCategory,
      }).populate("questions");

      console.log("length", questions, questions.length);

      let validQuestions = questions[0].questions.filter(
        (question) => !question.disabled
      );
      console.log("valid", validQuestions);
      if (validQuestions.length === 0) {
        throw Error("No questions in this category");
      } else {
        question = validQuestions[0];
        question.disabled = true;

        await Category.updateOne(
          { name: chosenCategory },
          { $set: { "questions.$[element].disabled": true } },
          {
            arrayFilters: [{ "element._id": question._id }],
          }
        );

        io.sockets.emit("question", { question, bidPlayer, chosenCategory });
      }
    } catch (error) {
      console.log(error);
      next(error);
    }
  });

  socket.on("answerGiven", async (correct) => {
    if (correct) {
      await User.findByIdAndUpdate(bidPlayer._id, {
        $inc: {
          score: max.amount,
        },
      });
      await User.findByIdAndUpdate(max.player.id, {
        $inc: {
          score: -max.amount,
        },
      });
    } else {
      await User.findByIdAndUpdate(bidPlayer._id, {
        $inc: {
          score: -max.amount,
        },
      });
      await User.findByIdAndUpdate(max.player.id, {
        $inc: {
          score: max.amount,
        },
      });
    }
    idx++;
    console.log(noOfPlayers);
    if (idx === noOfPlayers) {
      idx = 0;
    }
    io.sockets.emit("roundEnd");
    startRound();
  });
});
