require("dotenv").config();
const express = require("express");
const http = require("http");
const socket = require("socket.io");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const session = require("express-session");
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
const { Question } = require("./models/Question");
const { start } = require("repl");

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// middleware
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: false,
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

let bidPlayer
let idx=1

//shift this to another place
const startRound=()=>{
  console.log(idx)
  User.find({ role: "user" })
  .then((players)=>{
  // console.log("users", players)
    users=players;
    bidPlayer=users[idx]
    console.log("first", bidPlayer)
    io.sockets.emit('start',{
      bidPlayer
    })
  })
  .catch((err)=>{
    console.log(err)
  })
}

/////////////////////////////
// Sockets //
/////////////////////////////

let max={
  amount:0,
  player:null
};

io.on("connection", (socket) => {

  console.log("Made Socket Connection: ", socket.id);
  // socket.emit("login", { name: rug.generate(), bids: bids });

  startRound();

  socket.on("bid", async (content) => {
    console.log("bid content", content);

    max=max.amount>content.amount?max:{
      amount:content.amount,
      player:content.player,
      lastCategory:await User.findById(content.player.id).select("lastCategory -_id")
    };
    console.log("max",max.lastCategory)
    io.sockets.emit("bid", {content,bidPlayer});
    bids.push(content);
  });

  socket.on("stop-bid", async () => {
    // Category Selection
    const categories = await Category.find({}).select("name -_id")
    console.log(categories);
    io.sockets.emit("category", {categories, bidPlayer, max})
  });

  let question

  socket.on("chosenCategory",async ({chosenCategory,currentPlayer})=>{
    console.log("they chose", chosenCategory)
    user=await User.findByIdAndUpdate(currentPlayer.id,{lastCategory:chosenCategory})
    console.log("last", user.lastCategory)
    question= await Question.findOne({category:chosenCategory})
    console.log(question)
    io.sockets.emit("question",{question,bidPlayer, chosenCategory})
  })

  socket.on("answerGiven",async correct=>{
    if(correct)
    {
      let bidder= await User.findByIdAndUpdate(bidPlayer._id,{
        $inc:{
          score:max.amount
        }
      }) 
      let maxPlayer= await User.findByIdAndUpdate(max.player.id,{
        $inc:{
          score:-max.amount
        }
      })
    }
    else
    {
      let bidder= await User.findByIdAndUpdate(bidPlayer._id,{
        $inc:{
          score:-max.amount
        }
      }) 
      let maxPlayer= await User.findByIdAndUpdate(max.player.id,{
        $inc:{
          score:max.amount
        }
      })
    }
    idx++;
    if(idx===User.count({}))
    {
      idx=0;
    }
    io.sockets.emit("roundEnd")
    startRound()
  })
});
