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
let idx = -1;
// will track the round eliminate players after every 8 rounds
let roundNo = 0;
let noOfPlayers;

let max = {
  amount: 0,
  player: null,
};

let currentBidSession = null;
const liveUsers = [];
const validCategories = [];
let interval;
let question;
let chosenCategory;

// Functions
let startRound;

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
  validCategories.length = 0;
  // Send all categories which have available questions
  const categories = await Category.find({});
  const { lastCategory } = await User.findById(currentBidSession.maxPlayer);

  console.log("lastChosenCategory", lastCategory);

  categories.forEach((category) => {
    if (
      category.questions.length - category.disabledCount > 0 &&
      category.name !== lastCategory
    ) {
      validCategories.push(category.name);
    }
  });

  handleTimer(20, async function () {
    console.log("end of cat choosing");
    if (!currentBidSession.chosenCategory) {
      const foundMaxUser = liveUsers.find(
        (user) => user.userId == currentBidSession.maxPlayer
      );
      const foundBidPlayer = liveUsers.find(
        (user) => user.userId == currentBidSession.bidPlayer
      );
      if (!(foundMaxUser && foundBidPlayer)) startRound();
      else {
        //handle this in frontend and display loss of points in toast
        io.sockets.emit("noCategoryChosen");
        await User.findByIdAndUpdate(currentBidSession.maxPlayer, {
          $inc: {
            score: -max.amount,
          },
        });
        startRound();
      }
    }
  });

  currentBidSession.categoryTimeEnd = Date.now() + 20 * 1000;
  currentBidSession.save();
  console.log("category time end ", currentBidSession.categoryTimeEnd);
  io.sockets.emit("category", {
    categories: validCategories,
    max,
    endTime: currentBidSession.categoryTimeEnd,
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

startRound = async () => {
  updateLeaderBoard();
  roundNo++;
  idx++;
  console.log(noOfPlayers);
  if (idx === noOfPlayers) {
    idx = 0;
  }

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
  console.log("bid time end", currentBidSession.bidTimeEnd);

  console.log("Player currently being bid on", bidPlayer);
  io.sockets.emit("start", {
    // bidPlayer: currentBidSession.bidPlayer,
    bidPlayer,
    endTime: Date.parse(currentBidSession.bidTimeEnd),
  });
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
    if (currentBidSession) {
      if (Date.parse(currentBidSession.bidTimeEnd) - Date.now() > 0) {
        // bid session is present and time left
        socket.emit("start", {
          endTime: Date.parse(currentBidSession.bidTimeEnd),
          // bidPlayer: currentBidSession.bidPlayer,
          bidPlayer,
          bidHistory: currentBidSession.bidHistory,
        });
      } else if (currentBidSession.categoryTimeEnd - Date.now() > 0) {
        console.log("connection remade during category choosing");
        socket.emit("category", {
          categories: validCategories,
          max,
          endTime: currentBidSession.categoryTimeEnd,
          bidHistory: currentBidSession.bidHistory,
        });
      } else if (Date.parse(currentBidSession.answerTimeEnd) - Date.now() > 0) {
        console.log("connection remade during answering");
        socket.emit("question", {
          question,
          bidPlayer,
          chosenCategory: currentBidSession.chosenCategory,
          endTime: Date.parse(currentBidSession.answerTimeEnd),
          bidHistory: currentBidSession.bidHistory,
        });
      } else if (currentBidSession.roundEnd - Date.now() > 0) {
        console.log(
          "connection remade while waiting for next round",
          currentBidSession.roundEnd
        );
        socket.emit("wait", {
          endTime: Date.parse(currentBidSession.roundEnd),
        });
      } else if (currentBidSession.stopped) {
        socket.emit("stop-game");
      }
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

  socket.on("bid", ({ player, amount }) => {
    console.log(player, amount);
    let errors = "";
    if (amount > 1000) errors = "Can't bid greater than 1000";
    else if (amount < 0) errors = "Bid amount can't be negative";
    else if (amount <= max.amount) errors = `You have to bid greater than $${max.amount}`;
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

      // Stop bid if max bid reached
      if (amount === 1000) {
        clearInterval(interval);
        const foundMaxUser = liveUsers.find(
          (user) => user.userId == currentBidSession.maxPlayer
        );
        const foundBidPlayer = liveUsers.find(
          (user) => user.userId == currentBidSession.bidPlayer
        );
        if (!(foundMaxUser && foundBidPlayer)) startRound();
        else showCategories();
      }
    }
  });

  // socket.on("stop-bid", async () => {
  //   // Category Selection
  //   // Send only those categories which have available questions
  //   const categories = await Category.find({}).select("name -_id");
  //   console.log(categories);
  //   io.sockets.emit("category", { categories, bidPlayer, max });
  // });

  socket.on("chosenCategory", async ({ chosenCategory, currentPlayer }) => {
    clearInterval(interval);
    currentBidSession.categoryTimeEnd = 0;
    // console.log(chosenCategory)
    currentBidSession.chosenCategory = chosenCategory;
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

        let updatedCategory = await Category.updateOne(
          { name: chosenCategory },
          {
            $set: { "questions.$[element].disabled": true },
            $inc: { disabledCount: 1 },
          },
          {
            arrayFilters: [{ "element._id": question._id }],
          }
        );

        console.log("updated Category,", updatedCategory);

        currentBidSession.answerTimeEnd = Date.now() + question.duration * 1000;
        currentBidSession.save();
        endTime = currentBidSession.answerTimeEnd;

        console.log("answer time end ", currentBidSession.answerTimeEnd);

        io.sockets.emit("question", {
          question,
          bidPlayer,
          chosenCategory,
          endTime: Date.parse(currentBidSession.answerTimeEnd),
          // endTime: (currentBidSession.answerTimeEnd),
          bidHistory: currentBidSession.bidHistory,
        });
      }
    } catch (error) {
      console.log(error);
      next(error);
    }
  });

  socket.on("answerGiven", async (correct) => {
    currentBidSession.answerTimeEnd = 0;
    clearInterval(interval);
    console.log("answer given", correct);
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

    io.sockets.emit("result", { correct, name: bidPlayer.name });

    updateLeaderBoard();

    // Waiting for 30 seconds before next round
    currentBidSession.roundEnd = Date.now() + 30 * 1000;
    currentBidSession.save();
    io.sockets.emit("wait", {
      endTime: Date.parse(currentBidSession.roundEnd),
    });

    handleTimer(30, function () {
      io.sockets.emit("roundEnd");
      startRound();
    });
  });

  socket.on("stop-game", () => {
    clearInterval(interval);
    currentBidSession.stopped = true;
    currentBidSession.bidTimeEnd = Date.now();
    currentBidSession.categoryTimeEnd = Date.now();
    currentBidSession.answerTimeEnd = Date.now();
    currentBidSession.save();
    socket.broadcast.emit("stop-game");
  });

  socket.on("elimination", async () => {
    // Eliminate the players
    lastPlayers = await User.find({ role: "user", eligible: true }).sort({
      score: 1,
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
    socket.broadcast.emit("elimination", {
      ineligiblePlayers: [lastPlayers[0], lastPlayers[1]],
    });

    // update the leaderboard
    updateLeaderBoard();
  });
});
