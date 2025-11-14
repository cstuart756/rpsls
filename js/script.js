/* script.js
   RPSLS with:
   - inline SVG avatars (in HTML)
   - WebAudio micro-sounds (no external files)
   - Markov-style pattern predictor using last N moves
   - AI toggle + predictive weight (how often computer follows prediction)
   - Exportable history log
   - Exports core functions for unit testing
*/

const rules = {
  rock: ["scissors", "lizard"],
  paper: ["rock", "spock"],
  scissors: ["paper", "lizard"],
  lizard: ["paper", "spock"],
  spock: ["rock", "scissors"],
};

const choices = Array.from(document.querySelectorAll('.choice'));
const playerScoreEl = document.getElementById('player-score');
const computerScoreEl = document.getElementById('computer-score');
const resultText = document.getElementById('result-text');
const aiHint = document.getElementById('ai-hint');
const playerAvatarSlot = document.getElementById('player-avatar');
const computerAvatarSlot = document.getElementById('computer-avatar');
const countdownEl = document.getElementById('countdown');
const resetBtn = document.getElementById('reset-btn');
const historyEl = document.getElementById('history');
const limitCheckbox = document.getElementById('limit-tries');
const triesInput = document.getElementById('tries-input');

const soundToggle = document.getElementById('sound-toggle');
const aiToggle = document.getElementById('ai-toggle');
const aiOrderInput = document.getElementById('ai-order');
const aiWeightInput = document.getElementById('ai-weight');
const exportLogBtn = document.getElementById('export-log');

let playerScore = 0;
let computerScore = 0;
let roundsPlayed = 0;

const history = []; // array of {player, computer, result, timestamp}

// ---------------------- WebAudio micro-sounds ----------------------
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
}

// small click/pop for selection
function playClick() {
  if (!soundToggle.checked) return;
  try {
    ensureAudioContext();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.value = 900;
    g.gain.value = 0.06;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
    o.stop(audioCtx.currentTime + 0.13);
  } catch (e) { /* muted or context not allowed */ }
}

function playPop() {
  if (!soundToggle.checked) return;
  try {
    ensureAudioContext();
    const o1 = audioCtx.createOscillator();
    const o2 = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o1.type = 'sine'; o2.type = 'sawtooth';
    o1.frequency.value = 450; o2.frequency.value = 660;
    g.gain.value = 0.04;
    o1.connect(g); o2.connect(g); g.connect(audioCtx.destination);
    o1.start(); o2.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);
    o1.stop(audioCtx.currentTime + 0.18);
    o2.stop(audioCtx.currentTime + 0.18);
  } catch (e) {}
}

function playCheer() {
  if (!soundToggle.checked) return;
  try {
    ensureAudioContext();
    const now = audioCtx.currentTime;
    const g = audioCtx.createGain();
    g.gain.value = 0.02;
    g.connect(audioCtx.destination);

    const freqs = [740, 880, 1046];
    freqs.forEach((f, i) => {
      const o = audioCtx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(g);
      o.start(now + i * 0.08);
      o.stop(now + i * 0.08 + 0.18);
    });
  } catch (e) {}
}

// ---------------------- Utility & Avatar helpers ----------------------
function makeAvatarSVG(choice, small=false){
  const btn = document.querySelector(`.choice[data-choice="${choice}"]`);
  if (!btn) {
    const div = document.createElement('div');
    div.textContent = choice;
    return div;
  }
  const svg = btn.querySelector('svg').cloneNode(true);
  svg.classList.add('avatar-svg');
  if (small) svg.setAttribute('width','72');
  svg.classList.add('floaty');
  return svg;
}

// ---------------------- Pattern predictor (Markov-like) ----------------------
/*
  Strategy:
  - Keep player history array of choices (strings).
  - For order N (aiOrder), look for the last N choices as a sequence.
  - Count what followed that sequence previously; choose the most frequent follower as predicted next move.
  - If not found, fallback to most frequent overall player move.
  - getPrediction returns { predictedMove: string, confidence: 0..1 }
*/

function getPlayerHistorySequence(playerSequence, order) {
  if (!Array.isArray(playerSequence) || playerSequence.length === 0) return [];
  const seq = playerSequence.slice(-order);
  return seq;
}

function predictNextMove(playerHistory, order = 2) {
  // returns { predictedMove, confidence } where predictedMove is one of choices or null
  const possible = Object.keys(rules);
  if (!playerHistory || playerHistory.length === 0) {
    return { predictedMove: null, confidence: 0 };
  }
  order = Math.max(1, Math.min(5, Number(order) || 2));

  // Build map of sequence -> counts of following move
  // We'll iterate through history and count for sequences of length 'order'
  const followers = {}; // { 'rock|paper': { scissors: 2, rock:1 } }
  for (let i = 0; i + order < playerHistory.length; i++) {
    const seq = playerHistory.slice(i, i + order).join('|');
    const next = playerHistory[i + order];
    followers[seq] = followers[seq] || {};
    followers[seq][next] = (followers[seq][next] || 0) + 1;
  }

  const lastSeq = playerHistory.slice(-order).join('|');
  const countsForLast = followers[lastSeq];

  if (countsForLast) {
    // pick most frequent follower
    const entries = Object.entries(countsForLast);
    entries.sort((a,b)=> b[1]-a[1]);
    const total = entries.reduce((s,e)=>s+e[1],0);
    const [predictedMove, count] = entries[0];
    return { predictedMove, confidence: total > 0 ? count / total : 0 };
  }

  // fallback: pick overall most frequent player move
  const freq = {};
  playerHistory.forEach(m => freq[m] = (freq[m]||0)+1);
  const entries = Object.entries(freq).sort((a,b)=> b[1]-a[1]);
  if (entries.length === 0) return { predictedMove: null, confidence:0 };
  const total = playerHistory.length;
  return { predictedMove: entries[0][0], confidence: entries[0][1] / total };
}

// given an opponent move (predicted player move), choose a counter move randomly among counters
function pickCounterFor(predictedPlayerMove) {
  if (!predictedPlayerMove) {
    const keys = Object.keys(rules);
    return keys[Math.floor(Math.random()*keys.length)];
  }
  const counters = Object.keys(rules).filter(k => rules[k].includes(predictedPlayerMove));
  // If multiple counters (there will be 2), pick uniformly
  if (!counters || counters.length === 0) {
    const keys = Object.keys(rules);
    return keys[Math.floor(Math.random()*keys.length)];
  }
  return counters[Math.floor(Math.random()*counters.length)];
}

// ---------------------- Core game functions ----------------------
function getComputerChoiceUsingAI(playerHistory) {
  const aiEnabled = aiToggle.checked;
  if (!aiEnabled) return getComputerChoiceRandom();

  const order = Math.max(1, Math.min(5, Number(aiOrderInput.value) || 2));
  const weight = Math.max(0, Math.min(100, Number(aiWeightInput.value) || 80));
  const { predictedMove, confidence } = predictNextMove(playerHistory, order);

  // show hint to user
  if (predictedMove) {
    aiHint.textContent = `AI predicts you might choose "${predictedMove}" (confidence ${(confidence*100).toFixed(0)}%).`;
  } else {
    aiHint.textContent = '';
  }

  // Decide whether to use prediction based on weight and confidence
  const effectiveChance = (weight/100) * (confidence); // if confidence low, less likely
  const roll = Math.random();
  if (predictedMove && roll < effectiveChance) {
    // pick counter
    return pickCounterFor(predictedMove);
  }
  // else fallback to random
  return getComputerChoiceRandom();
}

function getComputerChoiceRandom() {
  const keys = Object.keys(rules);
  return keys[Math.floor(Math.random()*keys.length)];
}

function decideResult(player, computer){
  if(player === computer) return 'tie';
  return rules[player].includes(computer) ? 'win' : 'lose';
}

// ---------------------- Play flow + animations + sounds ----------------------
function playRound(playerChoice){
  if (limitCheckbox.checked) {
    const maxTries = Math.max(1, Number(triesInput.value) || 5);
    if (roundsPlayed >= maxTries) {
      resultText.textContent = `Max tries reached (${maxTries}). Reset to play again.`;
      return;
    }
  }

  playClick();

  // show player avatar
  playerAvatarSlot.innerHTML = '';
  playerAvatarSlot.appendChild(makeAvatarSVG(playerChoice));
  const playerSVG = playerAvatarSlot.querySelector('svg');
  if (playerSVG) playerSVG.classList.add('animated');

  // countdown
  let cd = 3;
  countdownEl.textContent = cd;
  countdownEl.classList.add('animated');

  const countdownInterval = setInterval(() => {
    cd--;
    if (cd > 0) {
      countdownEl.textContent = cd;
    } else {
      clearInterval(countdownInterval);
      countdownEl.textContent = '';
      countdownEl.classList.remove('animated');

      // compute AI-informed comp choice
      const playerHistoryOnly = history.map(h=>h.player);
      const compChoice = getComputerChoiceUsingAI(playerHistoryOnly);

      // reveal computer avatar
      computerAvatarSlot.innerHTML = '';
      computerAvatarSlot.appendChild(makeAvatarSVG(compChoice));
      const compSVG = computerAvatarSlot.querySelector('svg');
      if (compSVG) compSVG.classList.add('animated');

      // determine result
      const result = decideResult(playerChoice, compChoice);

      roundsPlayed++;
      if (result === 'win') { playerScore++; playCheer(); }
      else if (result === 'lose') { computerScore++; playPop(); }
      else { playClick(); }

      playerScoreEl.textContent = playerScore;
      computerScoreEl.textContent = computerScore;

      // animate winners/losers
      setTimeout(()=>{
        const playerSVG2 = playerAvatarSlot.querySelector('svg');
        const compSVG2 = computerAvatarSlot.querySelector('svg');
        if (result === 'win') {
          if (playerSVG2) playerSVG2.classList.add('shake');
          if (compSVG2) compSVG2.style.filter = 'grayscale(60%)';
          resultText.textContent = `You win — ${playerChoice} beats ${compChoice}!`;
        } else if (result === 'lose') {
          if (compSVG2) compSVG2.classList.add('shake');
          if (playerSVG2) playerSVG2.style.filter = 'grayscale(60%)';
          resultText.textContent = `You lose — ${compChoice} beats ${playerChoice}.`;
        } else {
          if (playerSVG2) playerSVG2.classList.add('shake');
          if (compSVG2) compSVG2.classList.add('shake');
          resultText.textContent = `It's a tie — both chose ${playerChoice}.`;
        }

        // log history
        history.unshift({ player: playerChoice, computer: compChoice, result, timestamp: Date.now() });
        appendHistory(playerChoice, compChoice, result);

        // cleanup animations
        setTimeout(()=> {
          [playerAvatarSlot.querySelector('svg'), computerAvatarSlot.querySelector('svg')].forEach(s => {
            if (!s) return;
            s.classList.remove('shake');
            s.style.filter = '';
          });
        }, 900);

      }, 200);
    }
  }, 420);
}

function appendHistory(playerChoice, computerChoice, result){
  const item = document.createElement('div');
  item.className = 'history-item';
  const d = new Date();
  item.textContent = `${d.toLocaleTimeString()}: You ${playerChoice} — Computer ${computerChoice} → ${result.toUpperCase()}`;
  historyEl.prepend(item);
  while(historyEl.children.length > 8) historyEl.removeChild(historyEl.lastChild);
}

// ---------------------- UI wiring ----------------------
choices.forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    disableChoices(true);
    const chosen = btn.dataset.choice;
    playRound(chosen);
    // safe re-enable after expected animation length
    setTimeout(()=> disableChoices(false), 1400);
  });
});

function disableChoices(disabled){
  choices.forEach(b=> b.disabled = disabled);
}

resetBtn.addEventListener('click', () => {
  playerScore = 0; computerScore = 0; roundsPlayed = 0;
  playerScoreEl.textContent = playerScore;
  computerScoreEl.textContent = computerScore;
  resultText.textContent = 'Choose your move';
  aiHint.textContent = '';
  playerAvatarSlot.innerHTML = '';
  computerAvatarSlot.innerHTML = '';
  historyEl.innerHTML = '';
  history.length = 0;
});

exportLogBtn.addEventListener('click', () => {
  const data = { created: new Date().toISOString(), rounds: history.slice(0,100) };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rpsls-history-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// keyboard access
document.addEventListener('keydown', (e) => {
  const map = {'1':'rock','2':'paper','3':'scissors','4':'lizard','5':'spock'};
  if (map[e.key]) {
    const btn = document.querySelector(`.choice[data-choice="${map[e.key]}"]`);
    if (btn && !btn.disabled) btn.click();
  }
});

// init placeholders
function initPlaceholders(){
  playerAvatarSlot.innerHTML = '<div style="text-align:center;color:#7b7b9a">Player</div>';
  computerAvatarSlot.innerHTML = '<div style="text-align:center;color:#7b7b9a">Computer</div>';
}
initPlaceholders();

// Expose core functions for unit testing (Node/Jest)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    rules,
    predictNextMove,
    pickCounterFor,
    decideResult,
    getComputerChoiceRandom,
    getComputerChoiceUsingAI // note: depends on DOM inputs in browser; tests can simulate
  };
}
