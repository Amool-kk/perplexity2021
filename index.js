const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
let rug = require("random-username-generator");
let bids = [];

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

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

const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
