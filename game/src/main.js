// Midnight Pantry — game orchestration: the loop, the screens (title,
// play, caught, clear, win), scoring, and the hand-off between the pure
// logic modules (world / guards / player) and the browser (input, audio,
// render). It also stages the maker's screenshots: index.html?shot=cover
// (and play / alert / win) sets up a real game state and freezes it, so
// the shots in screenshots/ are honest renders of this code.

import {
  DETECT_SUSPECT, SCORE_CHEESE, SCORE_GHOST_BONUS, SCORE_LEVEL_CLEAR,
  SCORE_TIME_BONUS_MAX, SCORE_TIME_BONUS_RATE, VIEW_H, VIEW_W,
} from './config.js';
import { buildLevel, solidsOf } from './levels.js';
import { createCat, updateCat } from './guards.js';
import { atExit, createPlayer, onRug, tossCrumb, updatePlayer } from './player.js';
import { attachInput, clearPressed, endFrame, pressed, readInput, takeClicks } from './input.js';
import { sfx, toggleMute, unlockAudio } from './audio.js';
import { drawGame, makeStaticLayer } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = {
  level: document.getElementById('hud-level'),
  cheese: document.getElementById('hud-cheese'),
  crumbs: document.getElementById('hud-crumbs'),
  eyeFill: document.getElementById('hud-eye-fill'),
  time: document.getElementById('hud-time'),
  score: document.getElementById('hud-score'),
};

const game = {
  screen: 'title',
  levelIndex: 0,
  level: null,
  solids: [],
  player: null,
  cats: [],
  staticLayer: null,
  time: 0,
  levelTime: 0,
  score: 0,
  cheeseThisLevel: 0,
  spotted: false,
  maxDetection: 0,
  lastBreakdown: [],
};

function loadLevel(index) {
  game.levelIndex = index;
  game.level = buildLevel(index);
  game.solids = solidsOf(game.level);
  game.player = createPlayer(game.level.playerStart);
  game.cats = game.level.catPaths.map((def) => createCat(def, game.solids));
  game.staticLayer = makeStaticLayer(game.level);
  game.levelTime = 0;
  game.cheeseThisLevel = 0;
  game.spotted = false;
  game.maxDetection = 0;
  game.screen = 'play';
}

function scoreLines(cheese, seconds, ghost) {
  const timeBonus = Math.max(0, SCORE_TIME_BONUS_MAX - Math.floor(seconds) * SCORE_TIME_BONUS_RATE);
  const parts = [
    `Slipped out unseen — ${SCORE_LEVEL_CLEAR}`,
    `Cheese × ${cheese} — ${cheese * SCORE_CHEESE}`,
    `Quick paws bonus — ${timeBonus}`,
  ];
  if (ghost) parts.push(`Never even suspected — ${SCORE_GHOST_BONUS}`);
  const total = SCORE_LEVEL_CLEAR + cheese * SCORE_CHEESE + timeBonus + (ghost ? SCORE_GHOST_BONUS : 0);
  return { parts, total };
}

function finishLevel() {
  const { parts, total } = scoreLines(game.cheeseThisLevel, game.levelTime, !game.spotted);
  game.score += total;
  const last = game.levelIndex === 2;
  game.lastBreakdown = parts.concat([`Total score — ${game.score}`]);
  game.screen = last ? 'win' : 'clear';
  if (last) sfx.win(); else sfx.clear();
}

function stepPlay(dt) {
  const input = readInput();
  const stepNoises = updatePlayer(game.player, input, game.solids, dt);
  if (stepNoises.length && game.player.stance === 'run') sfx.step(true);

  for (const click of takeClicks()) {
    if (game.level.crumbsLeft > 0) {
      game.level.crumbsLeft -= 1;
      tossCrumb(game.player, click.x, click.y);
      sfx.toss();
    }
  }

  // updatePlayer's noise list already carries footstep pings and the
  // clink of a crumb landing; the cats hear exactly what the player does.
  const noises = stepNoises;
  for (const c of game.player.crumbs) {
    if (c.landed && c.pinged && !c.heard) { c.heard = true; sfx.crumbLand(); }
  }

  const ctxForCats = {
    player: { x: game.player.x, y: game.player.y, stance: game.player.stance },
    noises,
    playerOnRug: onRug(game.player, game.level.rugs),
  };
  game.maxDetection = 0;
  for (const cat of game.cats) {
    const events = updateCat(cat, ctxForCats, dt);
    game.maxDetection = Math.max(game.maxDetection, cat.detection);
    if (cat.detection >= DETECT_SUSPECT) game.spotted = true;
    for (const ev of events) {
      if (ev === 'suspect') sfx.suspect();
      if (ev === 'alert') sfx.alert();
      if (ev === 'caught') {
        game.screen = 'caught';
        sfx.caught();
      }
    }
  }

  for (const ch of game.level.cheeses) {
    if (!ch.taken && Math.hypot(ch.x - game.player.x, ch.y - game.player.y) < 26) {
      ch.taken = true;
      game.cheeseThisLevel += 1;
      sfx.cheese();
    }
  }

  game.levelTime += dt;
  if (game.screen === 'play' && atExit(game.player, game.level.exit)) finishLevel();
}

function updateHud() {
  if (!game.level) return;
  const total = game.level.cheeses.length;
  hud.level.textContent = game.level.name;
  hud.cheese.textContent = `🧀 ${game.cheeseThisLevel}/${total}`;
  hud.crumbs.textContent = `🍪 crumbs ${game.level.crumbsLeft}`;
  hud.eyeFill.style.width = `${Math.round(game.maxDetection * 100)}%`;
  const s = Math.floor(game.levelTime);
  hud.time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  hud.score.textContent = String(game.score);
}

// --- screenshot staging -------------------------------------------------
function stageShot(kind) {
  const set = (cat, x, y, facing, extra = {}) => Object.assign(cat, { x, y, facing }, extra);
  if (kind === 'cover') {
    loadLevel(0);
    Object.assign(game.player, { x: 452, y: 512, facing: 0.4 });
    set(game.cats[0], 606, 148, 2.25, { detection: 0.3 });
    set(game.cats[1], 1010, 560, Math.PI, {});
    game.maxDetection = 0.3;
    game.screen = 'title'; // the cover shows the real title panel over the posed scene
  } else if (kind === 'play') {
    loadLevel(1);
    Object.assign(game.player, { x: 596, y: 300, facing: -0.4 });
    set(game.cats[0], 330, 344, 0.15, { detection: 0.15 });
    set(game.cats[2], 320, 112, 0, {});
    game.maxDetection = 0.15;
  } else if (kind === 'alert') {
    loadLevel(2);
    Object.assign(game.player, { x: 600, y: 440, facing: 2.6 });
    game.player.crumbs.push({ sx: 600, sy: 440, x: 664, y: 498, tx: 664, ty: 498, t: 1, landed: true, pinged: true, heard: true });
    set(game.cats[3], 716, 520, -2.2, { state: 'investigate', detection: 0.72, target: { x: 664, y: 498 } });
    set(game.cats[2], 520, 268, 0.1, { detection: 0.2 });
    game.maxDetection = 0.72;
    game.spotted = true;
  } else if (kind === 'win') {
    loadLevel(2);
    const { parts } = scoreLines(5, 96, false);
    game.score = 2450 + 2175;
    game.lastBreakdown = parts.concat([`Total score — ${game.score}`]);
    game.screen = 'win';
  }
  game.frozen = true;
  updateHud();
}

// --- boot -----------------------------------------------------------------
const params = new URLSearchParams(location.search);
attachInput(canvas, unlockAudio);
loadLevel(0);
game.screen = 'title';
if (params.get('shot')) {
  document.getElementById('hint').style.display = 'none';
  stageShot(params.get('shot'));
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.time += dt;

  if (!game.frozen) {
    if (game.screen === 'play') stepPlay(dt);
    else if (game.screen === 'title' && pressed('Enter')) { game.score = 0; loadLevel(0); clearPressed('Enter'); }
    else if (game.screen === 'caught' && (pressed('KeyR'))) { loadLevel(game.levelIndex); clearPressed('KeyR'); }
    else if (game.screen === 'clear' && pressed('Enter')) { loadLevel(game.levelIndex + 1); clearPressed('Enter'); }
    else if (game.screen === 'win' && pressed('Enter')) { game.score = 0; loadLevel(0); clearPressed('Enter'); }
    if (game.screen === 'play' && pressed('KeyR')) { loadLevel(game.levelIndex); clearPressed('KeyR'); }
    if (pressed('KeyM')) { toggleMute(); clearPressed('KeyM'); }
  }

  drawGame(ctx, game);
  if (game.screen === 'play') updateHud();
  endFrame();
  if (params.get('shot')) window.__shotReady = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// A small handle for local play-testing tools (and curious players).
window.MidnightPantry = game;
export { game };
