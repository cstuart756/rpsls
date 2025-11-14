// game.js
// Phaser 3 RPSLS game — single file, draws simple avatars with graphics and animations.
// Uses localStorage for score persistence.

const CHOICES = ["rock","paper","scissors","lizard","spock"];
const RULES = {
  rock:     { beats: ["scissors","lizard"] },
  paper:    { beats: ["rock","spock"] },
  scissors: { beats: ["paper","lizard"] },
  lizard:   { beats: ["spock","paper"] },
  spock:    { beats: ["scissors","rock"] }
};

const MAX_TRIES = 10;

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: '#061628',
  scene: {
    preload,
    create,
    update
  }
};

let game;
let playerScore = 0;
let cpuScore = 0;
let triesLeft = MAX_TRIES;
let difficulty = 'normal';
let aiPattern = []; // track player's last moves for pattern matching

export default init();

function init(){
  // restore from localStorage
  const saved = JSON.parse(localStorage.getItem('rpsls_state') || '{}');
  playerScore = saved.playerScore || 0;
  cpuScore = saved.cpuScore || 0;
  triesLeft = (saved.triesLeft==null) ? MAX_TRIES : saved.triesLeft;
  difficulty = saved.difficulty || 'normal';
  document.getElementById('difficulty').value = difficulty;
  document.getElementById('reset-btn').addEventListener('click', resetScore);
  document.getElementById('difficulty').addEventListener('change',(e)=>{
    difficulty = e.target.value;
    saveState();
  });
  game = new Phaser.Game(config);
  return game;
}

function preload(){}
function create(){
  const scene = this;
  // responsive layout: create a root container sized to the parent element
  const width = scene.scale.width;
  const height = Math.max(360, Math.min(720, scene.scale.height - 40));

  // background card
  const bg = scene.add.rectangle(width/2, height/2, Math.min(width-40,900), height - 20, 0x071827);
  bg.setStrokeStyle(2, 0x0b2430);

  // title text
  scene.add.text(30,20, 'Choose your avatar:', { fontSize: '20px', color:'#9be7ff' });

  // Avatars area
  const startX = 40;
  const startY = 60;
  const gapX = 120;
  CHOICES.forEach((choice, idx) => {
    const x = startX + idx*gapX;
    const y = startY + 80;
    // draw a simple avatar to a RenderTexture to look like an image
    const g = scene.make.graphics({x:0,y:0,add:false});
    drawAvatar(g, choice);
    const texKey = 'avatar_'+choice;
    g.generateTexture(texKey, 96, 96);
    const sprite = scene.add.sprite(x, y, texKey).setInteractive({useHandCursor:true});
    sprite.setData('choice', choice);
    sprite.setScale(0.9);
    // label
    scene.add.text(x - 36, y + 56, capitalize(choice), { fontSize:'14px', color:'#cfeefc' });
    sprite.on('pointerdown', () => onPlayerChoose(scene, choice, sprite));
    // keyboard support: space/enter when focused
    sprite.setInteractive().on('pointerover', () => sprite.setTint(0x88d7ff));
    sprite.on('pointerout', () => sprite.clearTint());
  });

  // Create CPU avatar placeholder
  scene.add.text(30, 220, 'CPU choice:', { fontSize: '16px', color:'#9be7ff' });
  const cpuPlaceholder = scene.add.rectangle(140, 300, 120, 120, 0x0b2b3a).setStrokeStyle(2,0x073245);
  cpuPlaceholder.setData('avatar','cpu');

  // Message text
  scene.roundText = scene.add.text(30, 360, 'Ready to play — select an avatar.', { fontSize:'16px', color:'#cfeefc', wordWrap:{width: Math.min(700, scene.scale.width-80)} });

  // animate and resize handlers
  scene.scale.on('resize', (gameSize) => onResize(scene, gameSize));

  // restore scoreboard UI
  updateUI();

  // accessibility - add hidden buttons in DOM for screen readers and keyboard-only users
  addAccessibleButtons(scene);
}

function update(){}
function onResize(scene, gameSize){
  // nothing heavy: let Phaser redraw positions if needed - simple demo uses absolute positions
}

function drawAvatar(g, kind){
  g.clear();
  // base circle
  g.fillStyle(0x0d2436, 1);
  g.fillRoundedRect(0,0,96,96,12);
  // draw emblem depending on kind
  const centerX = 48, centerY=38;
  g.lineStyle(3, 0x9be7ff, 1);
  switch(kind){
    case 'rock':
      g.fillStyle(0xbdbdbd,1);
      g.fillCircle(centerX, centerY, 20);
      g.strokeCircle(centerX, centerY, 20);
      break;
    case 'paper':
      g.fillStyle(0xffffff,1);
      g.fillRect(centerX-18, centerY-22, 36, 44);
      g.strokeRect(centerX-18, centerY-22, 36, 44);
      break;
    case 'scissors':
      // pair of blades
      g.lineStyle(6, 0x9be7ff);
      g.beginPath();
      g.moveTo(centerX-12, centerY+4);
      g.lineTo(centerX+14, centerY-10);
      g.moveTo(centerX-12, centerY-10);
      g.lineTo(centerX+14, centerY+4);
      g.strokePath();
      break;
    case 'lizard':
      g.fillStyle(0x94f08b,1);
      g.fillEllipse(centerX, centerY, 34, 18);
      g.fillCircle(centerX+12, centerY-6,4);
      break;
    case 'spock':
      // v-sign
      g.lineStyle(6,0x7dd3fc);
      g.beginPath();
      g.moveTo(centerX-8, centerY+12);
      g.lineTo(centerX, centerY-8);
      g.lineTo(centerX+8, centerY+12);
      g.strokePath();
      break;
  }
}

function onPlayerChoose(scene, playerChoice, sprite){
  if(triesLeft <= 0){
    scene.roundText.setText('No tries left — reset to play again.');
    return;
  }
  // push to pattern history
  aiPattern.push(playerChoice);
  if(aiPattern.length > 8) aiPattern.shift();

  // CPU picks depending on difficulty
  const cpuChoice = cpuPick(playerChoice);

  // animate sprites: create temporary textures for CPU choice and player
  const result = computeResult(playerChoice, cpuChoice);

  // update scores and tries
  if(result === 'win') playerScore++;
  else if(result === 'lose') cpuScore++;
  triesLeft--;

  // update UI and log
  const msg = `You chose ${capitalize(playerChoice)} — CPU chose ${capitalize(cpuChoice)}. ${result === 'win' ? 'You win this round!' : result==='lose' ? 'You lose this round.' : "It's a tie."}`;
  scene.roundText.setText(msg);
  updateUI();

  // quick sprite flash animation for user feedback
  sprite.setScale(1.05);
  scene.tweens.add({
    targets: sprite,
    scale: 0.9,
    duration: 350,
    ease: 'Cubic.easeOut'
  });

  // simple CPU avatar reveal using DOM overlay for accessibility (so screen readers read update)
  logRound(msg);

  saveState();
}

function cpuPick(playerChoice){
  // simple AI + pattern matching influenced by difficulty
  const rnd = Math.random();
  if(difficulty === 'easy'){
    // random mostly
    if (Math.random() < 0.8) return CHOICES[Math.floor(Math.random()*CHOICES.length)];
  } else if(difficulty === 'normal'){
    // pattern match: if last two moves equal, try to beat it with a probability
    const last = aiPattern.slice(-2);
    if(last.length >= 2 && last[0] === last[1] && Math.random() < 0.6){
      // pick a move that beats last[1]
      const target = last[1];
      return counterMoveTo(target);
    }
  } else { // hard
    // try to predict player's last move and counter it with higher chance
    const freq = {};
    aiPattern.forEach(m=> freq[m] = (freq[m]||0)+1);
    let likely = null; let best=0;
    for(const k in freq) if(freq[k] > best){best=freq[k]; likely=k}
    if(likely && Math.random() < 0.75) return counterMoveTo(likely);
  }
  // fallback random
  return CHOICES[Math.floor(Math.random()*CHOICES.length)];
}

function counterMoveTo(move){
  // return a random move that beats 'move'
  const beats = [];
  for(const m of CHOICES){
    if(RULES[m].beats.includes(move)) beats.push(m);
  }
  if(beats.length===0) return CHOICES[Math.floor(Math.random()*CHOICES.length)];
  return beats[Math.floor(Math.random()*beats.length)];
}

function computeResult(player, cpu){
  if(player === cpu) return 'tie';
  if(RULES[player].beats.includes(cpu)) return 'win';
  return 'lose';
}

function updateUI(){
  document.getElementById('score').textContent = `Player: ${playerScore} — CPU: ${cpuScore}`;
  document.getElementById('tries').textContent = `Tries left: ${triesLeft}`;
  const log = document.getElementById('round-log');
  if(triesLeft <= 0) log.textContent = 'Game Over — no tries left. Reset to play again.';
}

function logRound(text){
  const el = document.getElementById('round-log');
  const now = new Date();
  el.textContent = `[${now.toLocaleTimeString()}] ${text}`;
}

function resetScore(){
  playerScore = 0;
  cpuScore = 0;
  triesLeft = MAX_TRIES;
  aiPattern = [];
  updateUI();
  saveState();
  document.getElementById('round-log').textContent = 'Scores reset. Choose an avatar to start.';
}

function saveState(){
  localStorage.setItem('rpsls_state', JSON.stringify({
    playerScore, cpuScore, triesLeft, difficulty
  }));
}

function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1) }
