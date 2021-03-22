// Handles all the logic for the socket connection

const socket = io.connect("http://localhost:3000");
const bidAmount = document.getElementById("bid-amt");
const bidButton = document.getElementById("bid-btn");
const bidList = document.getElementById("bid-history");
const timer = document.getElementById("timer");
const categoriesList = document.getElementById("categories");
const categoryInput = document.getElementById("categoryInput");
const categoryBtn = document.getElementById("category-btn");
const questionText = document.getElementById("question");
const answer = document.getElementById("answer");
const answerSubmit = document.getElementById("answerSubmit");

const currentPlayer = {
  id: document.getElementById("player-id").innerHTML,
  name: document.getElementById("player-name").innerHTML,
};

let bidPlayer;
let interval;
socket.user = currentPlayer;

// doesn't make sense
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

socket.on("start", ({ bidPlayer }) => {
  console.log("curr", currentPlayer);
  console.log("bid", bidPlayer);

  categoriesList.style.display="none"
  categoryInput.style.display="none"
  categoryBtn.style.display="none"
  questionText.style.display="none"
  answer.style.display="none"
  answerSubmit.style.display="none"

  if (currentPlayer.id === bidPlayer._id) {
    console.log("Everyone bidding for you");
    bidButton.innerHTML = "Cannot bid for yourself";
    bidButton.disabled = true;
  }
  else {
    console.log("You can bid");
    bidButton.innerHTML = "Bid";
    bidButton.disabled = false;
  }
});

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

  // bid timer
  let time = 10;
  clearInterval(interval);
  interval = setInterval(() => {
    if (time <= 0) {
      clearInterval(interval);
      // End the bidding process
      if (currentPlayer.id === bidPlayer._id) {
        socket.emit("stop-bid");
      }
    } else {
      timer.innerHTML = `Time left for bidding: ${time}`;
      time--;
    }
  }, 1000);
});

socket.on("category", ({ categories, bidPlayer, max }) => {
  // console.log(currentPlayer.id, " ", max.player.id)
  categoriesList.style.display="inline";
  categoriesList.innerHTML="";
  categories.forEach((category) => {
    console.log(category, max.lastCategory)
    if (category != max.lastCategory.lastCategory)
      categoriesList.innerHTML += `<li>${category.name}</li>`;
  });
  if (currentPlayer.id === max.player.id) {
    categoryInput.style.display = "inline";
    categoryBtn.style.display = "inline";
    categoryBtn.addEventListener("click", () => {
      let chosenCategory = categoryInput.value;
      console.log("last", max.lastCategory.lastCategory);
      if (chosenCategory === max.lastCategory.lastCategory) {
        alert("You cant choose that!");
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

socket.on("question", ({ question, bidPlayer, chosenCategory }) => {
  // bidPlayer can only give the answer
  // Need to start a timer based on the question duration
  if (currentPlayer.id === bidPlayer._id) {
    console.log("hi");
    questionText.style.display = "inline";
    answer.style.display = "inline";
    answerSubmit.style.display = "inline";

    questionText.innerHTML = `<p>Catgory Chosen is: ${chosenCategory}.</p> Q)${question.text}`;

    answerSubmit.addEventListener("click", () => {
      let answerGiven = answer.value;
      console.log(answerGiven);
      let correct = false;
      if (answerGiven == question.answer) correct = true;
      socket.emit("answerGiven", correct);
    });
  }
  console.log("bidplayer", bidPlayer);
});

socket.on("roundEnd", () => {
  alert("New Round!!");
});
