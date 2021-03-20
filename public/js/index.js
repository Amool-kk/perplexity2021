// Handles all the logic for the socket connection

const socket = io.connect("http://localhost:3000");
const bidAmount = document.getElementById("bid-amt");
const bidButton = document.getElementById("bid-btn");
const bidList = document.getElementById("bid-history");
const timer = document.getElementById("timer");

const currentPlayer = {
  id: document.getElementById("player-id").innerHTML,
  name: document.getElementById("player-name").innerHTML,
};

let bidPlayer;
let interval;
socket.user = currentPlayer;

console.log(socket.user);

bidButton.addEventListener("click", () => {
  socket.emit("bid", {
    player: currentPlayer,
    amount: bidAmount.value,
  });
  bidAmount.value = "";
});

////////////////////////////
// Listen for events
////////////////////////////

socket.on("start", (data) => {
  bidPlayer = data.bidPlayer;
});

socket.on("bid", (content) => {
  console.log(content);
  if (
    content.player.id === currentPlayer.id ||
    currentPlayer.id === bidPlayer._id
  ) {
    bidButton.disabled = true;
  } else {
    bidButton.disabled = false;
  }
  bidList.innerHTML += `<li>${content.player.name} $${content.amount}`;

  // bid timer
  let time = 10;
  clearInterval(interval);
  interval = setInterval(() => {
    if (time <= 0) {
      clearInterval(interval);
      // End the bidding process
      if (currentPlayer.id === bidPlayer._id) {
        socket.emit("stop-bid", { bidPlayer });
      }
    } else {
      timer.innerHTML = `Time left for bidding: ${time}`;
      time--;
    }
  }, 1000);
});
