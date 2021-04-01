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
  clearElements();
  bidAmount.style.display = "none";
  bidButton.style.display = "none";
  timer.innerHTML = "You have been eliminated from the game";
  answer.style.display = "none";
  answerSubmit.style.display = "none";
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
  data.style.display = "none";

  if (currentPlayer.id === bidPlayer._id) {
    console.log("Everyone bidding for you");
    document.getElementById(
      "bid-player"
    ).innerHTML = `Everyone is bidding for you`;
    // bidButton.innerHTML = `<span class="first">Cannot bid for yourself</span>`;
    bidButton.style.display = "none";
    bidAmount.style.display = "none";
  } else {
    bidButton.style.display = "inline";
    bidAmount.style.display = "inline";
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

//////////////////////////////////
// Choosing Question category
//////////////////////////////////

socket.on("category", ({ categories, max, endTime, bidHistory }) => {
  document.getElementById("bid-player").innerHTML = "";
  bidList.innerHTML = "";
  if (bidHistory) {
    bidHistory.forEach(({ name, amount }) => {
      bidList.innerHTML += `<li>${name} $${amount}`;
    });
  }
  //do not dispaly bid button or bid input
  bidButton.style.display = "none";
  bidAmount.style.display = "none";

  console.log(endTime, categories, endTime);
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
    categoryInput.innerHTML = "";
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
    data.style.display = "inline";
    document.getElementById(
      "data"
    ).innerHTML = `${max.player.name} is choosing a category`;
    console.log(max.player.name, " is choosing a category");
  }
});

// Question and answer handling
socket.on(
  "question",
  ({ question, bidPlayer, chosenCategory, endTime, bidHistory }) => {
    if (bidHistory) {
      bidList.innerHTML = "";
      bidHistory.forEach(({ name, amount }) => {
        bidList.innerHTML += `<li>${name} $${amount}`;
      });
    }

    canBid = false;
    questionText.style.display = "inline";
    questionText.innerHTML = `<p>Category Chosen: ${chosenCategory}.</p> <br> Q. ${question.text}`;

    // question timer
    let time = Math.floor((endTime - Date.now()) / 1000);
    clearInterval(interval);
    interval = setInterval(() => {
      if (time < 0) clearInterval(interval);
      else {
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

        answer.style.display = "none";
        answerSubmit.style.display = "none";
      });
    }
    console.log("bidplayer", bidPlayer);
  }
);

socket.on("result", ({ correct, name }) => {
  let msg = "";
  if (correct) msg = `${name} has given correct answer`;
  else msg = `${name} has given an incorrect answer`;
  toastBody.innerHTML = msg;
  $(".toast").toast("show");
});

// Handling Elimination
socket.on("elimination", ({ ineligiblePlayers }) => {
  console.log(ineligiblePlayers);
  if (
    currentPlayer.id === ineligiblePlayers[0]._id ||
    currentPlayer.id === ineligiblePlayers[1]._id
  ) {
    currentPlayer.eligible = false;
    // Clear everying on the page
    toastBody.innerHTML = "You have been eliminated from the game";
    $(".toast").toast("show");
    timer.innerHTML = "You have been eliminated from the game";
  }
  clearElements();
  bidAmount.style.display = "none";
  bidButton.style.display = "none";
  answer.style.display = "none";
  answerSubmit.style.display = "none";
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

socket.on("wait", ({ endTime }) => {
  canBid = false;
  clearElements();
  let time = Math.floor((endTime - Date.now()) / 1000);
  clearInterval(interval);
  interval = setInterval(() => {
    if (time < 0) clearInterval(interval);
    else {
      timer.innerHTML = `${time} seconds before the next round begins`;
      time--;
    }
  }, 1000);

  // Cleanup everything on the page
  bidList.innerHTML = "";
});

socket.on("roundEnd", () => {
  toastBody.innerHTML = "New Round Begins Now!";
  $(".toast").toast("show");
});

socket.on("stop-game", () => {
  canBid = false;
  clearInterval(interval);
  toastBody.innerHTML = "Game is currently paused now, will resume in sometime";
  $(".toast").toast("show");
  timer.innerHTML = "Game is currently paused";
  // Clear remaining elements
  clearElements();
  document.getElementById("bid-player").innerHTML = "";
});

function checkAnswer(givenAnswer, correctAnswer) {
  if (
    givenAnswer.split(" ").join("").toLowerCase() ===
    correctAnswer.split(" ").join("").toLowerCase()
  )
    return 1;
  return 0;
}

function clearElements() {
  // This function will clear the necessary elements
  bidList.innerHTML = "";
  data.innerHTML = "";
  questionText.innerHTML = "";
}
