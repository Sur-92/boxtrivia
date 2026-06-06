// Generate SQL to (re)seed a Box Trivia SQLite DB with every games/*.json.
// Each board is run through the real validateSeed first; only clean boards
// are emitted. Output is SQL on stdout — pipe it into sqlite3:
//
//   node scripts/seed-db.ts | sqlite3 "$HOME/Library/Application Support/boxtrivia/boxtrivia.db"
//
// It clears existing games first, so the DB ends up holding exactly the
// bundled boards.

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { validateSeed } from '../src/main/validate.ts'

const here = dirname(fileURLToPath(import.meta.url))
const gamesDir = join(here, '../games')

function q(s: string): string {
  return `'${s.replace(/'/g, "''")}'`
}

const out: string[] = []
out.push('PRAGMA foreign_keys = ON;')
out.push('BEGIN;')
out.push('DELETE FROM clues;')
out.push('DELETE FROM categories;')
out.push('DELETE FROM games;')

let gameId = 0
let catId = 0
let clueId = 0
let skipped = 0

for (const file of readdirSync(gamesDir).filter((f) => f.endsWith('.json')).sort()) {
  const raw = JSON.parse(readFileSync(join(gamesDir, file), 'utf-8'))
  const { seed, errors } = validateSeed(raw)
  if (errors.length || !seed) {
    skipped++
    process.stderr.write(`SKIP ${file}: ${errors.join('; ')}\n`)
    continue
  }
  gameId++
  const f = seed.final
  out.push(
    `INSERT INTO games (id, title, final_category, final_clue, final_response) VALUES (${gameId}, ${q(seed.title)}, ${f ? q(f.category) : 'NULL'}, ${f ? q(f.clue) : 'NULL'}, ${f ? q(f.response) : 'NULL'});`
  )
  seed.categories.forEach((cat, ci) => {
    catId++
    const thisCat = catId
    out.push(`INSERT INTO categories (id, game_id, name, position) VALUES (${thisCat}, ${gameId}, ${q(cat.name)}, ${ci});`)
    cat.clues.forEach((cl, li) => {
      clueId++
      out.push(
        `INSERT INTO clues (id, category_id, value, clue, response, position) VALUES (${clueId}, ${thisCat}, ${cl.value}, ${q(cl.clue)}, ${q(cl.response)}, ${li});`
      )
    })
  })
}

out.push('COMMIT;')
process.stderr.write(`Seeded ${gameId} games, ${catId} categories, ${clueId} clues (${skipped} skipped)\n`)
process.stdout.write(out.join('\n') + '\n')
