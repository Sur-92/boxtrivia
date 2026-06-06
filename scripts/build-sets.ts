// One-time transform: take all categories across the themed boards in
// games/, shuffle them (seeded, deterministic), and deal them into 15
// numbered Sets of 5 categories each. Finals are shuffled and one is
// assigned per Set. The original themed files are then removed.
//
//   node scripts/build-sets.ts
//
// Re-running is safe: it reads whatever *.json are in games/ at the time.

import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { SeedGame, SeedCategory, FinalRound } from '../src/shared/types.ts'

const here = dirname(fileURLToPath(import.meta.url))
const gamesDir = join(here, '../games')

// Deterministic PRNG (mulberry32) so the shuffle is reproducible.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
}

const originalFiles = readdirSync(gamesDir).filter((f) => f.endsWith('.json')).sort()

const categories: SeedCategory[] = []
const finals: FinalRound[] = []
for (const file of originalFiles) {
  const g = JSON.parse(readFileSync(join(gamesDir, file), 'utf-8')) as SeedGame
  categories.push(...g.categories)
  if (g.final) finals.push(g.final)
}

const SET_SIZE = 5
const setCount = Math.floor(categories.length / SET_SIZE)
if (categories.length % SET_SIZE !== 0) {
  process.stderr.write(`Warning: ${categories.length} categories is not a multiple of ${SET_SIZE}; extras dropped.\n`)
}

const rng = mulberry32(20260606)
shuffle(categories, rng)
shuffle(finals, rng)

for (let i = 0; i < setCount; i++) {
  const setCats = categories.slice(i * SET_SIZE, (i + 1) * SET_SIZE)
  const game: SeedGame = { title: `Set ${i + 1}`, categories: setCats }
  if (finals[i]) game.final = finals[i]
  const name = `set-${String(i + 1).padStart(2, '0')}.json`
  writeFileSync(join(gamesDir, name), JSON.stringify(game, null, 2) + '\n')
}

// Remove the original themed files (now folded into the Sets).
for (const file of originalFiles) {
  if (!/^set-\d+\.json$/.test(file)) rmSync(join(gamesDir, file))
}

process.stderr.write(`Built ${setCount} sets from ${categories.length} categories and ${finals.length} finals.\n`)
