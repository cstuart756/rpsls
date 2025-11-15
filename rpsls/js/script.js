const moves = ["rock", "paper", "scissors", "lizard", "spock"];
const winConditions = {
    rock: ["scissors", "lizard"],
    paper: ["rock", "spock"],
    scissors: ["paper", "lizard"],
    lizard: ["spock", "paper"],
    spock: ["scissors", "rock"]
};

let playerScore = 0;
let computerScore = 0;
let soundOn = true;
let moveHistory = [];
let lastMoves = [];

const soundWin = document.getElementById("soundWin");
const soundLose = document.getElementById("soundLose");
const soundTie = document.getElementById("soundTie");
const soundClick = document.getElementById("soundClick");

const resultMessage = document.getElementById("resultMessage");
const aiPredictionText = document.getElementById("aiPrediction");
const hintBox = document.getElementById("hintBox");

function playSound(sound) {
    if (soundOn) sound.play();
}

/* 🧠 Pattern-Matching AI */
function predictMove() {
    if (lastMoves.length < 3) return null;

    const freq = {};
    lastMoves.forEach(m => freq[m] = (freq[m] || 0) + 1);

    return Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0];
}

function computerChoice() {
    const difficulty = document.getElementById("difficultySelect").value;

    if (difficulty !== "hard") return moves[Math.floor(Math.random() * moves.length)];

    const predicted = predictMove();

    if (!predicted) return moves[Math.floor(Math.random() * moves.length)];

    aiPredictionText.innerHTML = `AI predicts you may choose: <strong>${predicted}</strong>`;

    for (let m of moves) {
        if (winConditions[m].includes(predicted)) return m;
    }

    return moves[Math.floor(Math.random() * moves.length)];
}

/* Main Game Function */
document.querySelectorAll(".choice").forEach(choice => {
    choice.addEventListener("click", () => {
        playSound(soundClick);

        const playerMove = choice.dataset.move;
        const cpuMove = computerChoice();

        lastMoves.push(playerMove);
        if (lastMoves.length > 5) lastMoves.shift();

        moveHistory.push(`You: ${playerMove} | AI: ${cpuMove}`);
        updateHistory();

        let result = "";
        if (playerMove === cpuMove) {
            result = "tie";
        } else if (winConditions[playerMove].includes(cpuMove)) {
            result = "win";
        } else {
            result = "lose";
        }

        updateResult(result, playerMove, cpuMove);
    });
});

function updateResult(result, playerMove, cpuMove) {
    if (result === "win") {
        playerScore++;
        resultMessage.className = "result-message result-win";
        resultMessage.innerText = `You win! ${playerMove} beats ${cpuMove}!`;
        playSound(soundWin);
    } else if (result === "lose") {
        computerScore++;
        resultMessage.className = "result-message result-lose";
        resultMessage.innerText = `You lose! ${cpuMove} beats ${playerMove}!`;
        playSound(soundLose);
    } else {
        resultMessage.className = "result-message result-tie";
        resultMessage.innerText = `It's a tie!`;
        playSound(soundTie);
    }

    document.getElementById("playerScore").innerText = playerScore;
    document.getElementById("computerScore").innerText = computerScore;
}

function updateHistory() {
    const list = document.getElementById("moveList");
    list.innerHTML = "";
    moveHistory.slice(-12).forEach(item => {
        const li = document.createElement("li");
        li.innerText = item;
        list.appendChild(li);
    });
}

document.getElementById("soundToggle").onclick = () => {
    soundOn = !soundOn;
    document.getElementById("soundToggle").classList.toggle("active");
    document.getElementById("soundToggle").innerText = soundOn ? "Sound: ON" : "Sound: OFF";
};

document.getElementById("resetGame").onclick = () => {
    playerScore = 0;
    computerScore = 0;
    moveHistory = [];
    lastMoves = [];
    updateHistory();

    resultMessage.innerText = "Game reset!";
    aiPredictionText.innerText = "";
    document.getElementById("playerScore").innerText = 0;
    document.getElementById("computerScore").innerText = 0;
};
