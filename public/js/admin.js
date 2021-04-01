// Sockets connection for the admin page
const socket = io.connect("http://localhost:3000");

document.getElementById("start-game").addEventListener("click", () => {
  socket.emit("start-game");
  console.log("game started");
});

document.getElementById("stop-game").addEventListener("click", () => {
  socket.emit("stop-game");
  console.log("Game stopped");
});

document.getElementById("eliminate").addEventListener("click", () => {
  socket.emit("elimination");
  console.log("Elimination process begins");
});
