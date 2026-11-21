// Midnight Pantry — hand-in program (Node 22, standard library only).
//
// The game itself is the static site in game/ (open game/index.html in a
// desktop browser, no build step, no network). This program is what hands
// the entry in: it copies game/ and screenshots/ into the output directory
// and writes dossier.json there with buildDossier from the vendored
// make.fun library, exactly the bytes the grader rebuilds and compares.
//
// In the grader the output directory is /output; anywhere else set
// MAKEFUN_OUTPUT_DIR to stand in for it:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The program is deterministic: same repository in, same bytes out.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps, mirrored so a local run refuses anything the scorer
// would refuse instead of writing an entry that cannot pass.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function countFiles(dir) {
  let n = 0;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    n += name.isDirectory() ? countFiles(join(dir, name.name)) : 1;
  }
  return n;
}

mkdirSync(outDir, { recursive: true });
copyTree(join(root, 'game'), join(outDir, 'game'));
if (existsSync(join(root, 'screenshots'))) {
  copyTree(join(root, 'screenshots'), join(outDir, 'screenshots'));
}

const dossier = buildDossier(outDir, DOSSIER_CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

const gameFiles = countFiles(join(outDir, 'game'));
const shotFiles = existsSync(join(outDir, 'screenshots')) ? countFiles(join(outDir, 'screenshots')) : 0;
console.log(`midnight-pantry: wrote ${gameFiles} game files, ${shotFiles} screenshots and dossier.json (${dossier.length} bytes) to ${outDir}`);
