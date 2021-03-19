// Handles all the logic for the socket connection

const socket = io.connect("http://localhost:3000");
const currentPlayerId = document.getElementById("player-id").innerHTML;
let bidPlayer;
console.log(currentPlayerId);
socket.user = currentPlayerId;

console.log(socket.user);

////////////////////////////
// Listen for events
////////////////////////////

socket.on("start", (data) => {
  bidPlayer = data.bidPlayer;
});
