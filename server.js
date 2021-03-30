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
  isAuthenticated,
} = require("./middleware/authMiddleware");
const { User } = require("./models/User");
const Category = require("./models/Category");
const Bid = require("./models/Bid");

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
app.get("/", isAuthenticated, (req, res) => {
  res.render("home");
});

app.use(authRoutes);

app.get("/admin*", isAdmin);
app.use("/admin", questionRoutes);

app.get("/game", requireAuth, (req, res) => {
  res.render("game");
});

////////////////////////////
// Game logic starts here //
////////////////////////////

let bidPlayer;
let idx = 0;
// will track the round eliminate players after every 8 rounds
let roundNo = 1;
let interval;
let noOfPlayers;

let max = {
  amount: 0,
  player: null,
};

let currentBidSession = null;
const liveUsers = [];
const validCategories = [];
let interval;

/////////////////////////////
// Utility Functions
/////////////////////////////

function handleTimer(time, callback) {
  clearInterval(interval);
  interval = setInterval(() => {
    if (time < 0) {
      clearInterval(interval);
      callback();
    } else {
      time--;
    }
  }, 1000);
}

const showCategories = async () => {
  // Send all categories which have available questions
  const categories = await Category.find({});
  const lastChosenCategory = await User.findById(currentBidSession.maxPlayer)
    .lastCategory;

  categories.forEach((category) => {
    if (
      category.questions.length - category.disabledCount > 0 &&
      category.name !== lastChosenCategory
    ) {
      validCategories.push(category.name);
    }
  });

  currentBidSession.categoryTimeEnd = Date.now() + 20 * 1000;
  currentBidSession.save();

  io.sockets.emit("category", {
    categories: validCategories,
    max,
    endTime: Date.parse(currentBidSession.categoryTimeEnd),
  });

  handleTimer(20, async function () {
    if (!currentBidSession.chosenCategory) {
      const foundMaxUser = liveUsers.find(
        (user) => user.userId == currentBidSession.maxPlayer
      );
      const foundBidPlayer = liveUsers.find(
        (user) => user.userId == currentBidSession.bidPlayer
      );
      if (!(foundMaxUser && foundBidPlayer)) startRound();
      if (foundMaxUser) {
        await User.findByIdAndUpdate(currentBidSession.maxPlayer, {
          $inc: {
            score: -max.amount,
          },
        });
      }
    }
  });
};

const startRound = async () => {
  console.log(idx);

  max.amount = 0;
  max.player = null;

  const users = await User.find({ role: "user", eligible: true });
  bidPlayer = users[idx];

  currentBidSession = new Bid({
    bidPlayer,
    maxBid: 0,
    maxPlayer: null,
    bidHistory: [],
  });

  // liveUsers.forEach((user) => {
  //   currentBidSession.activePlayers.push(user.userId);
  // });
  currentBidSession.bidTimeEnd = Date.now() + 60 * 1000;
  currentBidSession.save();

  // Adding a timer in the backend for referencing
  handleTimer(60, function () {
    const foundMaxUser = liveUsers.find(
      (user) => user.userId == currentBidSession.maxPlayer
    );
    const foundBidPlayer = liveUsers.find(
      (user) => user.userId == currentBidSession.bidPlayer
    );
    if (!(foundMaxUser && foundBidPlayer)) startRound();
    else showCategories();
  });

  console.log("game started");

  console.log("Player currently being bid on", bidPlayer);
  io.sockets.emit("start", {
    // bidPlayer: currentBidSession.bidPlayer,
    bidPlayer,
    endTime: Date.parse(currentBidSession.bidTimeEnd),
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

/////////////////////////////
// Sockets //
/////////////////////////////

io.on("connection", (socket) => {
  console.log("Made Socket Connection: ", socket.id);

  socket.on("storePlayerInfo", ({ playerId }) => {
    const playerInfo = {
      userId: playerId,
      socketId: socket.id,
    };
    liveUsers.push(playerInfo);

    // Handling Players who are joining in between
    if (
      currentBidSession &&
      Date.parse(currentBidSession.bidTimeEnd) - Date.now() > 0
    ) {
      // bid session is present and time left
      socket.emit("start", {
        endTime: Date.parse(currentBidSession.bidTimeEnd),
        // bidPlayer: currentBidSession.bidPlayer,
        bidPlayer,
        bidHistory: currentBidSession.bidHistory,
      });
      updateLeaderBoard();
    }
  });

  socket.on("disconnect", () => {
    for (var i = 0; i < liveUsers.length; ++i) {
      var c = liveUsers[i];

      if (c.socketId == socket.id) {
        liveUsers.splice(i, 1);
        break;
      }
    }
  });

  socket.on("start-game", async () => {
    noOfPlayers = await User.count({ role: "user", eligible: true });
    console.log("count", noOfPlayers);
    updateLeaderBoard();
    startRound();
    console.log(liveUsers);
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

      // eleminate the players on front-end
      socket.emit("eliminate", {
        ineligiblePlayers: [lastPlayers[0], lastPlayers[1]],
      });
    }

    // update the leaderboard
    updateLeaderBoard();

    // choose the next player to be bid on
    startRound();
  });

  socket.on("bid", ({ player, amount }) => {
    console.log(player, amount);
    let errors = "";
    if (amount > 1000) errors = "Can't bid greater than 1000";
    else if (amount < 0) errors = "Bid amount can't be negative";
    else if (amount < max.amount) errors = `Can't bid less than $${max.amount}`;
    if (errors) socket.emit("bid", { errors });
    else {
      max.amount = amount;
      max.player = player;
      currentBidSession.maxBid = amount;
      currentBidSession.maxPlayer = player.id;
      currentBidSession.bidHistory.push({
        name: player.name,
        amount: amount,
      });
      currentBidSession.save();
      bids.push({ player, amount });
      io.sockets.emit("bid", { player, amount });
    }
  });

  // socket.on("stop-bid", async () => {
  //   // Category Selection
  //   // Send only those categories which have available questions
  //   const categories = await Category.find({}).select("name -_id");
  //   console.log(categories);
  //   io.sockets.emit("category", { categories, bidPlayer, max });
  // });

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
