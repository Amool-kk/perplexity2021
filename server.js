require("dotenv").config();
const express = require("express");
const http = require("http");
const socket = require("socket.io");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const { checkUser } = require("./middleware/authMiddleware");
let rug = require("random-username-generator");

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// middleware
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());

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
  res.sendFile(__dirname + "/index.html");
});
app.use(authRoutes);

io.on("connection", (socket) => {
  console.log("Socket Connection: ", socket.id);
  socket.emit("login", { name: rug.generate(), bids: bids });

  socket.on("bid", (content) => {
    console.log(content);
    socket.emit("bid", content);
    socket.broadcast.emit("bid", content);
    bids.push(content);
  });
});
