// All drawing for Midnight Pantry. The static layer (floor, rugs, shelf
// units, crates, the exit hole) is painted once per level into an
// offscreen canvas; each frame then lays down light cones, actors and
// atmosphere. Vision cones are true polygons, raycast against the room's
// cover, so the lantern light visibly bends around crates and shelf ends.

import { COLORS, CONE_HALF_ANGLE, CONE_RANGE, VIEW_H, VIEW_W } from './config.js';
import { conePolygon, makeRng } from './world.js';
import { coneMood } from './guards.js';

const CAT_FURS = ['#e08a3c', '#5a5f6e', '#d9c9a8', '#7a4a35'];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function paintFloor(ctx, level) {
  const rng = makeRng(level.seed);
  ctx.fillStyle = '#1d1428';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Wooden floorboards, running the width of the room.
  const boardH = 40;
  for (let y = 0; y < VIEW_H; y += boardH) {
    const tone = 30 + Math.floor(rng() * 14);
    ctx.fillStyle = `rgb(${tone + 14}, ${tone - 2}, ${tone + 12})`;
    ctx.fillRect(0, y, VIEW_W, boardH - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, y + boardH - 2, VIEW_W, 2);
    for (let i = 0; i < 26; i++) { // grain specks
      ctx.fillStyle = `rgba(0,0,0,${0.04 + rng() * 0.07})`;
      ctx.fillRect(rng() * VIEW_W, y + rng() * (boardH - 4), 8 + rng() * 30, 1.4);
    }
  }
  // Shadow runners: deep red rugs where the floor is darkest.
  for (const r of level.rugs) {
    ctx.fillStyle = COLORS.rugRed;
    roundRect(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
    ctx.strokeStyle = COLORS.rugTrim; ctx.lineWidth = 3;
    roundRect(ctx, r.x + 7, r.y + 7, r.w - 14, r.h - 14, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(201,162,77,0.5)';
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
    ctx.fillRect(-9, -9, 18, 18); ctx.restore();
  }
}

function paintShelf(ctx, s, rng) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(ctx, s.x + 4, s.y + 6, s.w, s.h, 6); ctx.fill();
  ctx.fillStyle = COLORS.wallWood;
  roundRect(ctx, s.x, s.y, s.w, s.h, 6); ctx.fill();
  ctx.fillStyle = '#2e1d12';
  roundRect(ctx, s.x + 5, s.y + 5, s.w - 10, s.h - 10, 4); ctx.fill();
  // Jars and tins on the shelf, in a muted pantry palette.
  const jars = ['#7d8c5c', '#a8574a', '#5c7a8c', '#c2a15a', '#8c5c7a', '#b0a696'];
  const horizontal = s.w >= s.h;
  const n = Math.max(1, Math.floor((horizontal ? s.w : s.h) / 34));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const jx = horizontal ? s.x + t * s.w : s.x + s.w / 2;
    const jy = horizontal ? s.y + s.h / 2 : s.y + t * s.h;
    ctx.fillStyle = jars[Math.floor(rng() * jars.length)];
    ctx.beginPath(); ctx.arc(jx, jy, 7 + rng() * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(jx - 3, jy - 3, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = COLORS.wallWoodLight; ctx.lineWidth = 2;
  roundRect(ctx, s.x, s.y, s.w, s.h, 6); ctx.stroke();
}

function paintCrate(ctx, c) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(ctx, c.x + 4, c.y + 6, c.w, c.h, 5); ctx.fill();
  ctx.fillStyle = COLORS.crateWood;
  roundRect(ctx, c.x, c.y, c.w, c.h, 5); ctx.fill();
  ctx.strokeStyle = COLORS.crateWoodDark; ctx.lineWidth = 4;
  roundRect(ctx, c.x + 3, c.y + 3, c.w - 6, c.h - 6, 4); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(c.x + 5, c.y + 5); ctx.lineTo(c.x + c.w - 5, c.y + c.h - 5);
  ctx.moveTo(c.x + c.w - 5, c.y + 5); ctx.lineTo(c.x + 5, c.y + c.h - 5);
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  for (const [nx, ny] of [[10, 10], [c.w - 10, 10], [10, c.h - 10], [c.w - 10, c.h - 10]]) {
    ctx.beginPath(); ctx.arc(c.x + nx, c.y + ny, 2.2, 0, Math.PI * 2); ctx.fill();
  }
}

function paintExit(ctx, e) {
  const cx = e.x + e.w / 2;
  ctx.fillStyle = '#3a2c1c';
  roundRect(ctx, e.x - 6, e.y - 4, e.w + 12, e.h + 10, 12); ctx.fill();
  ctx.fillStyle = '#05060a';
  ctx.beginPath();
  ctx.moveTo(e.x + 6, e.y + e.h);
  ctx.lineTo(e.x + 6, e.y + 22);
  ctx.quadraticCurveTo(cx, e.y - 14, e.x + e.w - 6, e.y + 22);
  ctx.lineTo(e.x + e.w - 6, e.y + e.h);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = COLORS.exitGlow; ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.75; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.cheese;
  ctx.font = '15px serif'; ctx.textAlign = 'center';
  ctx.fillText('🧀', cx, e.y + e.h + 20);
}

export function makeStaticLayer(level) {
  const c = document.createElement('canvas');
  c.width = VIEW_W; c.height = VIEW_H;
  const ctx = c.getContext('2d');
  paintFloor(ctx, level);
  paintExit(ctx, level.exit);
  const rng = makeRng(level.seed * 7 + 5);
  for (const s of level.walls) paintShelf(ctx, s, rng);
  for (const cr of level.crates) paintCrate(ctx, cr);
  return c;
}

function drawCone(ctx, cat, solids, time) {
  const mood = coneMood(cat);
  const color = mood === 'alert' ? COLORS.coneAlert : mood === 'suspect' ? COLORS.coneSuspect : COLORS.coneCalm;
  const flicker = 0.93 + 0.07 * Math.sin(time * 11 + cat.id * 2.7);
  const pts = conePolygon(cat.x, cat.y, cat.facing, CONE_RANGE, CONE_HALF_ANGLE, solids);
  const tipX = cat.x + Math.cos(cat.facing) * CONE_RANGE;
  const tipY = cat.y + Math.sin(cat.facing) * CONE_RANGE;
  const grad = ctx.createLinearGradient(cat.x, cat.y, tipX, tipY);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(255, 180, 60, 0)');
  ctx.save();
  ctx.globalAlpha = flicker;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
  // The lantern's warm pool around the cat itself.
  const pool = ctx.createRadialGradient(cat.x, cat.y, 4, cat.x, cat.y, 64);
  pool.addColorStop(0, 'rgba(255, 200, 90, 0.20)');
  pool.addColorStop(1, 'rgba(255, 200, 90, 0)');
  ctx.fillStyle = pool;
  ctx.beginPath(); ctx.arc(cat.x, cat.y, 64, 0, Math.PI * 2); ctx.fill();
}

function drawCheese(ctx, ch, time) {
  if (ch.taken) return;
  const bob = Math.sin(time * 2.4 + ch.x) * 2.5;
  ctx.save();
  ctx.translate(ch.x, ch.y + bob);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 12 - bob, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COLORS.cheese;
  ctx.beginPath();
  ctx.moveTo(-13, 6); ctx.lineTo(13, 6); ctx.lineTo(13, -9);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d9a92e';
  for (const [hx, hy, r] of [[4, 1, 3], [9, -4, 2.2], [-4, 3, 2]]) {
    ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawCrumb(ctx, c) {
  ctx.fillStyle = '#c98d4e';
  ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5e3a1a';
  for (const [dx, dy] of [[-2, -1], [2, 2], [0, -3]]) {
    ctx.beginPath(); ctx.arc(c.x + dx, c.y + dy, 1.3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawMouse(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(0, 6, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(p.facing);
  // Tail, swaying behind.
  ctx.strokeStyle = '#c9a0a8'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-13, 0);
  ctx.quadraticCurveTo(-24, Math.sin(time * 6) * 5, -31, Math.sin(time * 6 + 1) * 7);
  ctx.stroke();
  // Body and head.
  ctx.fillStyle = '#9aa3b2';
  ctx.beginPath(); ctx.ellipse(0, 0, 15, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#aeb7c4';
  ctx.beginPath(); ctx.ellipse(9, 0, 8.5, 7, 0, 0, Math.PI * 2); ctx.fill();
  // Ears.
  ctx.fillStyle = '#8b95a5';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(5, s * 7.5, 4.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#e8b7bf';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(5, s * 7.5, 2.4, 0, Math.PI * 2); ctx.fill(); }
  // The little red scarf every pantry mouse deserves.
  ctx.fillStyle = '#c93a4a';
  ctx.beginPath(); ctx.moveTo(2, -6); ctx.lineTo(2, 6); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
  // Nose and eye.
  ctx.fillStyle = '#e88a97';
  ctx.beginPath(); ctx.arc(17, 0, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#14161c';
  ctx.beginPath(); ctx.arc(10, -3.4, 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawCat(ctx, cat, time) {
  const fur = CAT_FURS[(cat.id - 1) % CAT_FURS.length];
  ctx.save();
  ctx.translate(cat.x, cat.y);
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath(); ctx.ellipse(0, 7, 19, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(cat.facing);
  // Tail.
  ctx.strokeStyle = fur; ctx.lineWidth = 5; ctx.lineCap = 'round';
  const wag = Math.sin(time * (cat.state === 'chase' ? 14 : 3) + cat.id) * 6;
  ctx.beginPath(); ctx.moveTo(-15, 0); ctx.quadraticCurveTo(-26, wag, -33, wag * 0.6); ctx.stroke();
  // Body.
  ctx.fillStyle = fur;
  ctx.beginPath(); ctx.ellipse(0, 0, 19, 14.5, 0, 0, Math.PI * 2); ctx.fill();
  if (cat.id % 2 === 1) { // tabby stripes
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 3;
    for (const sx of [-8, -1, 6]) { ctx.beginPath(); ctx.moveTo(sx, -11); ctx.lineTo(sx + 2, 11); ctx.stroke(); }
  }
  // Head, ears, face.
  ctx.beginPath(); ctx.ellipse(13, 0, 11, 9.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, -7); ctx.lineTo(9, -15); ctx.lineTo(14, -8);
  ctx.moveTo(6, 7); ctx.lineTo(9, 15); ctx.lineTo(14, 8);
  ctx.fill();
  ctx.fillStyle = cat.state === 'chase' ? '#ff5040' : '#ffe9a8';
  ctx.beginPath(); ctx.arc(16, -3.6, 2, 0, Math.PI * 2); ctx.arc(16, 3.6, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // The lantern it carries, swinging at its side.
  const lx = cat.x + Math.cos(cat.facing + 2.2) * 20;
  const ly = cat.y + Math.sin(cat.facing + 2.2) * 20;
  ctx.fillStyle = '#2c2c34';
  roundRect(ctx, lx - 4, ly - 5, 8, 11, 2); ctx.fill();
  ctx.fillStyle = '#ffd76a';
  roundRect(ctx, lx - 2.4, ly - 2.6, 4.8, 6, 1.4); ctx.fill();
  // Detection meter and mood mark above the head.
  if (cat.detection > 0.03) {
    const w = 34;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, cat.x - w / 2, cat.y - 34, w, 6, 3); ctx.fill();
    ctx.fillStyle = cat.detection >= 1 ? '#ff3b30' : cat.detection >= 0.45 ? '#ff8c2e' : '#ffc44d';
    roundRect(ctx, cat.x - w / 2, cat.y - 34, w * Math.min(1, cat.detection), 6, 3); ctx.fill();
  }
  if (cat.state === 'suspect' || cat.state === 'chase') {
    ctx.font = '900 19px "Avenir Next", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = cat.state === 'chase' ? '#ff5040' : '#ffb02e';
    ctx.fillText(cat.state === 'chase' ? '!' : '?', cat.x, cat.y - 40);
  }
}

function panel(ctx, title, lines, accent = '#ffd98a') {
  ctx.fillStyle = 'rgba(5, 4, 14, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = 'rgba(20, 14, 34, 0.95)';
  roundRect(ctx, VIEW_W / 2 - 330, VIEW_H / 2 - 170, 660, 340, 18); ctx.fill();
  ctx.strokeStyle = accent; ctx.lineWidth = 2.5;
  roundRect(ctx, VIEW_W / 2 - 330, VIEW_H / 2 - 170, 660, 340, 18); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = '900 54px "Avenir Next", "Segoe UI", sans-serif';
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 88);
  ctx.fillStyle = '#e8ddc8';
  ctx.font = '500 21px "Avenir Next", "Segoe UI", sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 - 28 + i * 34));
}

// Draw one frame. `game` is main.js's state object (see main.js).
export function drawGame(ctx, game) {
  const { level, player, cats, time } = game;
  ctx.drawImage(game.staticLayer, 0, 0);
  for (const ch of level.cheeses) drawCheese(ctx, ch, time);
  for (const c of player.crumbs) drawCrumb(ctx, c);
  for (const cat of cats) drawCone(ctx, cat, game.solids, time);
  drawMouse(ctx, player, time);
  for (const cat of cats) drawCat(ctx, cat, time);

  // Night atmosphere: a soft dark falloff toward the corners.
  const vig = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 340, VIEW_W / 2, VIEW_H / 2, 880);
  vig.addColorStop(0, 'rgba(4, 2, 12, 0)');
  vig.addColorStop(1, 'rgba(4, 2, 12, 0.5)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (game.maxDetection > 0.55 && game.screen === 'play') {
    ctx.fillStyle = `rgba(255, 40, 30, ${(game.maxDetection - 0.55) * 0.16})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  if (game.screen === 'title') {
    panel(ctx, 'MIDNIGHT PANTRY', [
      'Sneak the cheese. Dodge the lantern cats.',
      '',
      'WASD / arrows — creep      Shift — tiptoe (quiet, slow)',
      'Hold Space — scamper (fast, loud)   Click — toss a crumb',
      '',
      'Reach the mouse hole unseen. Press Enter to begin.',
    ]);
  } else if (game.screen === 'caught') {
    panel(ctx, 'CAUGHT!', [
      'The lantern swings round — and there you are.',
      '',
      `Cheese banked: ${game.score}`,
      'Press R to try the level again.',
    ], '#ff7a6a');
  } else if (game.screen === 'clear') {
    panel(ctx, 'LEVEL CLEAR!', game.lastBreakdown.concat(['', 'Press Enter for the next floor.']), '#8affc1');
  } else if (game.screen === 'win') {
    panel(ctx, 'THE PANTRY IS YOURS', game.lastBreakdown.concat(['', 'Every crumb counts. Press Enter to play again.']), '#ffd94d');
  }
}
