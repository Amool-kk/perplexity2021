// Sockets connection for the admin page
const socket = io.connect("http://localhost:3000");

document.getElementById("start-game").addEventListener("click", () => {
  socket.emit("start-game");
  console.log("game started");
});

socket.on("roundEnd", () => {
  // alert("New Round is going to start");
  socket.emit("next-round");
});
