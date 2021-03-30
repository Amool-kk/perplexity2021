// Handles all the logic for the socket connection

const socket = io.connect("http://localhost:3000");
const bidAmount = document.getElementById("bid-amt");
const bidButton = document.getElementById("bid-btn");
const bidList = document.getElementById("bid-history");
const timer = document.getElementById("timer");
const categoryInput = document.getElementById("categoryInput");
const categoryBtn = document.getElementById("category-btn");
const questionText = document.getElementById("question");
const answer = document.getElementById("answer");
const answerSubmit = document.getElementById("answerSubmit");
const toastBody = document.querySelector(".toast-body");

$(".toast").toast();

const currentPlayer = {
  id: document.getElementById("player-id").innerHTML,
  name: document.getElementById("player-name").innerHTML,
  eligible: document.getElementById("player-status").innerHTML === "true",
};

socket.on("connect", function (data) {
  socket.emit("storePlayerInfo", { playerId: currentPlayer.id });
});

if (currentPlayer.eligible === false) {
  document.querySelector("body").style.display = "none";
}

console.log(document.getElementById("player-id").innerHTML);

let bidPlayer;
let interval;

// variable to check if bidding is allowed or not
let canBid = false;

////////////////////////////
// bidding for a player
////////////////////////////
bidButton.addEventListener("click", () => {
  if (canBid === false) {
    toastBody.innerHTML = "You can't bid now, bidding will start in sometime";
    $(".toast").toast("show");
  } else {
    socket.emit("bid", {
      player: currentPlayer,
      amount: parseInt(bidAmount.value),
    });
    // if (bidAmount.value >= 0 && bidAmount.value <= 1000) {
    //   socket.emit("bid", {
    //     player: currentPlayer,
    //     amount: bidAmount.value,
    //   });
    // } else {
    //   toastBody.innerHTML = "Invalid bid, try again";
    //   $(".toast").toast("show");
    // }
  }
  bidAmount.value = "";
});

////////////////////////////
// Listen for events
////////////////////////////

// Starting / restarting the game
socket.on("start", ({ bidPlayer, endTime, bidHistory }) => {
  console.log("currentPlayer", currentPlayer);
  console.log("bidPlayer", bidPlayer);
  canBid = true;

  categoryInput.style.display = "none";
  categoryBtn.style.display = "none";
  questionText.style.display = "none";
  answer.style.display = "none";
  answerSubmit.style.display = "none";

  if (currentPlayer.id === bidPlayer._id) {
    console.log("Everyone bidding for you");
    bidButton.innerHTML = `<span class="first">Cannot bid for yourself</span>`;
    bidButton.disabled = true;
  } else {
    console.log("You can bid");
    bidButton.innerHTML = `<span class="first">Bid</span>`;
    bidButton.disabled = false;
    // display the bid player to everyone
    document.getElementById(
      "bid-player"
    ).innerHTML = `Everyone is bidding for ${bidPlayer.name}`;
  }
  // bid timer
  let time = Math.floor((endTime - Date.now()) / 1000);
  clearInterval(interval);
  interval = setInterval(() => {
    if (time < 0) {
      clearInterval(interval);
      // End the bidding process
      // if (currentPlayer.id === bidPlayer._id) {
      //   socket.emit("stop-bid");
      // }
    } else {
      timer.innerHTML = `${time} seconds left for bidding`;
      time--;
    }
  }, 1000);

  // Handling Bid History in case of refreshes
  bidList.innerHTML = "";
  if (bidHistory) {
    bidHistory.forEach(({ name, amount }) => {
      bidList.innerHTML += `<li>${name} $${amount}`;
    });
  }
});

////////////////////////////
// Listening for bids
////////////////////////////
socket.on("bid", ({ player, amount, errors }) => {
  if (errors) {
    toastBody.innerHTML = errors;
    $(".toast").toast("show");
  } else {
    if (player.id === currentPlayer.id) bidButton.disabled = true;
    else bidButton.disabled = false;
    bidList.innerHTML += `<li>${player.name} $${amount}`;
  }
});

// socket.on("bid", (data) => {
//   console.log(data);
//   content = data.content;
//   bidPlayer = data.bidPlayer;
//   console.log("curplayer", currentPlayer);
//   console.log("bid made by", content);
//   if (
//     content.player.id === currentPlayer.id ||
//     currentPlayer.id === bidPlayer._id
//   ) {
//     bidButton.disabled = true;
//   } else {
//     bidButton.disabled = false;
//   }
//   bidList.innerHTML += `<li>${content.player.name} $${content.amount}`;
//   if (content.amount > maxBidValue) {
//     maxBidValue = content.amount;
//   }
// });

//////////////////////////////////
// Choosing Question category
//////////////////////////////////

socket.on("category", ({ categories, max, endTime }) => {
  canBid = false;
  categoryInput.style.display = "none";

  // category timer
  let time = Math.floor((endTime - Date.now()) / 1000);
  clearInterval(interval);
  interval = setInterval(() => {
    if (time < 0) clearInterval(interval);
    else {
      timer.innerHTML = `${time} seconds left for selecting Category`;
      time--;
    }
  }, 1000);

  if (currentPlayer.id === max.player.id) {
    categoryInput.style.display = "inline";
    categories.forEach((category) => {
      let opt = document.createElement("option");
      opt.value = category;
      opt.innerHTML = category;
      categoryInput.appendChild(opt);
    });

    categoryBtn.style.display = "inline";

    categoryBtn.addEventListener("click", () => {
      let chosenCategory = categoryInput.value;
      socket.emit("chosenCategory", { chosenCategory, currentPlayer });
      categoryInput.style.display = "none";
      categoryBtn.style.display = "none";
    });
  } else {
    document.getElementById(
      "data"
    ).innerHTML = `${max.player.name} is choosing a category`;
    console.log(max.player.name, " is choosing a category");
  }
});

// Question and answer handling
socket.on("question", ({ question, bidPlayer, chosenCategory }) => {
  canBid = false;
  questionText.style.display = "inline";
  questionText.innerHTML = `<p>Catgory Chosen is: ${chosenCategory}.</p> Q)${question.text}`;

  // timer based on the question duration
  let time = question.duration;
  clearInterval(interval);
  interval = setInterval(() => {
    if (time < 0) {
      clearInterval(interval);
      // End the bidding process
      if (currentPlayer.id === bidPlayer._id) {
        socket.emit("answerGiven", false);
      }
    } else {
      timer.innerHTML = `${time} seconds left for answering`;
      time--;
    }
  }, 1000);

  // bidPlayer can only give the answer
  if (currentPlayer.id === bidPlayer._id) {
    answer.style.display = "inline";
    answerSubmit.style.display = "inline";

    answerSubmit.addEventListener("click", () => {
      let givenAnswer = answer.value;
      console.log(givenAnswer);
      let correct = false;
      if (checkAnswer(givenAnswer, question.answer)) correct = true;
      socket.emit("answerGiven", correct);
    });
  }
  console.log("bidplayer", bidPlayer);
});

// Handling Elimination
socket.on("eliminate", ({ ineligiblePlayers }) => {
  if (
    currentPlayer.id === ineligiblePlayers[0]._id ||
    currentPlayer.id === ineligiblePlayers[1]._id
  ) {
    currentPlayer.eligible = false;
    document.querySelector("body").style.display = "none";
    alert("You have been eliminated from this game");
  }
});

socket.on("updateBoard", (data) => {
  const players = data.players;
  document.getElementById("leader-board").innerHTML = "";
  players.forEach((player, index) => {
    document.getElementById("leader-board").innerHTML += `<div class="item">
      <div class="pos">${index + 1}</div>
      <div class="pic" style="background-image: url('${
        player.profilePhoto
      }')"></div>
      <div class="name">${player.name}</div>
      <div class="score">${player.score}</div> 
    </div>`;
  });
});

socket.on("roundEnd", () => {
  toastBody.innerHTML = "New Round Begins Now!";
  $(".toast").toast("show");
  maxBidValue = 0;
});

function checkAnswer(givenAnswer, correctAnswer) {
  if (
    givenAnswer.split(" ").join("").toLowerCase() ===
    correctAnswer.split(" ").join("").toLowerCase()
  )
    return 1;
  return 0;
}
