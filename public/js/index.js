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

const currentPlayer = {
  id: document.getElementById("player-id").innerHTML,
  name: document.getElementById("player-name").innerHTML,
  eligible: document.getElementById("player-status").innerHTML === "true",
};

if (currentPlayer.eligible === false) {
  document.querySelector("body").style.display = "none";
}

console.log(document.getElementById("player-id").innerHTML);

let bidPlayer;
let interval;
socket.user = currentPlayer;

// doesn't make sense
console.log(socket.user);

// variable to check if bidding is allowed or not
let canBid = false;

////////////////////////////
// bidding for a player
////////////////////////////
bidButton.addEventListener("click", () => {
  if (canBid === false) {
    alert("You can't bid now, bidding will resume in sometime");
  } else {
    if (bidAmount.value >= 0 && bidAmount.value <= 1000) {
      socket.emit("bid", {
        player: currentPlayer,
        amount: bidAmount.value,
      });
    } else {
      alert("Can't bid greater than 1000");
    }
  }
  bidAmount.value = "";
});

////////////////////////////
// Listen for events
////////////////////////////

// Starting the game
socket.on("start", ({ bidPlayer }) => {
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
  let time = 60;
  clearInterval(interval);
  interval = setInterval(() => {
    if (time < 0) {
      clearInterval(interval);
      // End the bidding process
      if (currentPlayer.id === bidPlayer._id) {
        socket.emit("stop-bid");
      }
    } else {
      timer.innerHTML = `${time} seconds left for bidding`;
      time--;
    }
  }, 1000);

  bidList.innerHTML = "";
});

// Listening for bids
socket.on("bid", (data) => {
  console.log(data);
  content = data.content;
  bidPlayer = data.bidPlayer;
  console.log("curplayer", currentPlayer);
  console.log("bid made by", content);
  if (
    content.player.id === currentPlayer.id ||
    currentPlayer.id === bidPlayer._id
  ) {
    bidButton.disabled = true;
  } else {
    bidButton.disabled = false;
  }
  bidList.innerHTML += `<li>${content.player.name} $${content.amount}`;
});

// Choosing the Question category
socket.on("category", ({ categories, bidPlayer, max }) => {
  canBid = false;

  categoryInput.style.display = "inline";
  categories.forEach((category) => {
    console.log(category, max.lastCategory);
    if (category != max.lastCategory.lastCategory) {
      var opt = document.createElement("option");
      opt.value = category.name;
      opt.innerHTML = category.name;
      categoryInput.appendChild(opt);
    }
  });

  if (currentPlayer.id === max.player.id) {
    // categoryInput.style.display = "inline";
    categoryBtn.style.display = "inline";
    categoryBtn.addEventListener("click", () => {
      let chosenCategory = categoryInput.value;
      console.log("last", max.lastCategory.lastCategory);
      if (chosenCategory === max.lastCategory.lastCategory) {
        alert("You can't choose that!");
      } else {
        // console.log("currrrr", currentPlayer);
        socket.emit("chosenCategory", { chosenCategory, currentPlayer });
        categoryInput.style.display = "none";
        categoryBtn.style.display = "none";
      }
    });
    // console.log("choose a category")
  } else {
    timer.innerHTML = `${max.player.name} is choosing a category`;
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
  // Isko thik kar dena
  alert("New Round Begins Now!");
});

function checkAnswer(givenAnswer, correctAnswer) {
  if (
    givenAnswer.split(" ").join("").toLowerCase() ===
    correctAnswer.split(" ").join("").toLowerCase()
  )
    return 1;
  return 0;
}
