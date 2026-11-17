// Entry program for the lean make.fun frontend (competition makefun-frontend-01).
//
// What it does, nothing more: it copies app/ and screenshots/ from beside this
// file into the output directory and writes output/dossier.json with
// buildDossier from vendor/makefun-frontend.ts (the kit's copy, unchanged).
// The grader runs this program twice in a sandbox with no network; both runs
// must write the same bytes, so there is no timestamp, no randomness and no
// network access anywhere below — only deterministic file copies.
//
// Usage:  MAKEFUN_OUTPUT_DIR=out node main.ts
// Without MAKEFUN_OUTPUT_DIR the output directory is /output.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// The gate's own caps (reference/gate.json): at most 3 screenshots of 256 KiB,
// at most 993 files / 16 MiB in app/, paths at most 1000 bytes, dossier text
// at most 160 KiB. Passing them here makes buildDossier refuse exactly what
// the scorer would refuse, instead of handing in a dossier that fails.
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
  app_path_max_bytes: 1000,
};

// Start from a clean output directory so a stale file can never survive a run.
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const name of ['app', 'screenshots']) {
  const src = join(repoRoot, name);
  if (existsSync(src)) cpSync(src, join(outDir, name), { recursive: true });
}

const dossier = buildDossier(outDir, caps);
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(`wrote ${outDir} (dossier.json: ${dossier.length} bytes)`);
