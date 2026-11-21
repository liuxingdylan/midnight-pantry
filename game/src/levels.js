// The three pantry floors of Midnight Pantry, as plain data.
// Walls are shelf units and crates are loose boxes: both block movement and
// sight. Rugs are shadowed floor runners where the mouse is harder to see.
// Cats walk their `path` as a loop, pausing at each corner to look around.

function wall(x, y, w, h) { return { x, y, w, h }; }
function crate(x, y) { return { x, y, w: 54, h: 54 }; }
function rug(x, y, w, h) { return { x, y, w, h }; }
function cheese(x, y) { return { x, y, taken: false }; }
function cat(path, phase = 0) { return { path, phase }; }

export const LEVELS = [
  {
    name: 'Level 1 · The Pantry Door',
    seed: 1101,
    crumbs: 3,
    playerStart: { x: 92, y: 700 },
    exit: { x: 1150, y: 56, w: 84, h: 66 },
    walls: [
      wall(300, 180, 260, 36), wall(300, 420, 260, 36),
      wall(720, 300, 300, 36), wall(620, 520, 36, 180),
    ],
    crates: [crate(200, 300), crate(480, 600), crate(880, 150), crate(980, 560), crate(760, 620)],
    rugs: [rug(420, 480, 180, 110), rug(900, 330, 170, 110)],
    cheeses: [cheese(330, 140), cheese(700, 470), cheese(1050, 690)],
    cats: [
      cat([[200, 120], [1080, 120], [1080, 262], [200, 262]]),
      cat([[1150, 650], [820, 650], [820, 480], [1150, 480]], 2),
    ],
  },
  {
    name: 'Level 2 · The Long Shelves',
    seed: 2202,
    crumbs: 3,
    playerStart: { x: 92, y: 720 },
    exit: { x: 1156, y: 44, w: 80, h: 64 },
    walls: [
      wall(140, 170, 420, 34), wall(640, 170, 500, 34),
      wall(140, 400, 300, 34), wall(520, 400, 620, 34),
      wall(240, 610, 360, 34), wall(760, 610, 380, 34),
    ],
    crates: [crate(620, 236), crate(420, 464), crate(900, 460), crate(1080, 250), crate(180, 290)],
    rugs: [rug(470, 240, 150, 100), rug(700, 470, 160, 100)],
    cheeses: [cheese(130, 95), cheese(1140, 290), cheese(620, 690), cheese(180, 690)],
    cats: [
      cat([[120, 320], [1160, 320], [1160, 368], [120, 368]]),
      cat([[1160, 540], [300, 540], [300, 585], [1160, 585]], 1),
      cat([[70, 95], [560, 95], [560, 140], [70, 140]], 3),
    ],
  },
  {
    name: 'Level 3 · The Chef’s Gauntlet',
    seed: 3303,
    crumbs: 4,
    playerStart: { x: 640, y: 724 },
    exit: { x: 590, y: 30, w: 100, h: 56 },
    walls: [
      wall(180, 150, 34, 220), wall(180, 150, 300, 34),
      wall(800, 150, 300, 34), wall(1066, 150, 34, 220),
      wall(540, 330, 200, 34),
      wall(340, 520, 260, 34), wall(770, 520, 250, 34),
      wall(620, 560, 34, 160),
    ],
    crates: [crate(420, 326), crate(760, 326), crate(150, 620), crate(1080, 620), crate(600, 116)],
    rugs: [rug(480, 380, 180, 110), rug(880, 380, 170, 110), rug(240, 400, 150, 100)],
    cheeses: [cheese(92, 92), cheese(1188, 92), cheese(640, 452), cheese(92, 736), cheese(1188, 736)],
    cats: [
      cat([[120, 450], [300, 450], [300, 700], [120, 700]]),
      cat([[1160, 450], [1050, 450], [1050, 700], [1160, 700]], 2),
      cat([[240, 240], [1040, 240], [1040, 300], [240, 300]], 1),
      cat([[690, 430], [690, 650], [745, 650], [745, 430]], 3),
    ],
  },
];

// Deep-copies a level definition into fresh, mutable run state.
export function buildLevel(index) {
  const def = LEVELS[index];
  return {
    index,
    name: def.name,
    seed: def.seed,
    crumbsLeft: def.crumbs,
    playerStart: { ...def.playerStart },
    exit: { ...def.exit },
    walls: def.walls.map((r) => ({ ...r })),
    crates: def.crates.map((r) => ({ ...r })),
    rugs: def.rugs.map((r) => ({ ...r })),
    cheeses: def.cheeses.map((c) => ({ ...c })),
    catPaths: def.cats.map((c) => ({ path: c.path.map((p) => [...p]), phase: c.phase })),
  };
}

// Every solid rectangle of a level: outer walls plus shelves and crates.
export function solidsOf(level) {
  const W = 1280, H = 800, T = 28;
  return [
    { x: 0, y: 0, w: W, h: T }, { x: 0, y: H - T, w: W, h: T },
    { x: 0, y: 0, w: T, h: H }, { x: W - T, y: 0, w: T, h: H },
    ...level.walls, ...level.crates,
  ];
}
