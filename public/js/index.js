// Handles all the logic for the socket connection

const socket = io.connect("http://localhost:3000");
const currentPlayerId = document.getElementById("player-id").innerHTML;
console.log(currentPlayerId);
socket.user = currentPlayerId;

socket.emit("join");
console.log(socket.user);
