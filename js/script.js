const choices = document.querySelectorAll(".choices img");
const resultText = document.getElementById("result-text");
const computerChoiceText = document.getElementById("computer-choice");
const playerScoreEl = document.getElementById("player-score");
const computerScoreEl = document.getElementById("computer-score");

let playerScore = 0;
let computerScore = 0;

const rules = {
  rock: ["scissors", "lizard"],
  paper: ["rock", "spock"],
  scissors: ["paper", "lizard"],
  lizard: ["paper", "spock"],
  spock: ["rock", "scissors"],
};

choices.forEach(choice => {
  choice.addEventListener("click", () => {
    const playerChoice = choice.dataset.choice;
    const computerChoice = getComputerChoice();
    const result = getResult(playerChoice, computerChoice);

    updateScore(result);
    displayResult(playerChoice, computerChoice, result);
  });
});

function getComputerChoice() {
  const options = Object.keys(rules);
  return options[Math.floor(Math.random() * options.length)];
}

function getResult(player, computer) {
  if (player === computer) return "tie";
  return rules[player].includes(computer) ? "win" : "lose";
}

function updateScore(result) {
  if (result === "win") playerScore++;
  if (result === "lose") computerScore++;
  playerScoreEl.textContent = playerScore;
  computerScoreEl.textContent = computerScore;
}

function displayResult(player, computer, result) {
  computerChoiceText.textContent = `Computer chose: ${computer}`;
  if (result === "win") resultText.textContent = "You Win!";
  else if (result === "lose") resultText.textContent = "You Lose!";
  else resultText.textContent = "It's a Tie!";
}
