// Validate every JSON board in games/ against the authoring rules.
// Run: npm run validate:games   (Node 23+ runs TS natively)
// Exits non-zero if any file has a blocking rule violation.

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { validateSeed } from '../src/main/validate.ts'

const here = dirname(fileURLToPath(import.meta.url))
const gamesDir = join(here, '../games')
const files = readdirSync(gamesDir).filter((f) => f.endsWith('.json')).sort()

let failed = 0
let totalWarnings = 0

for (const f of files) {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(join(gamesDir, f), 'utf-8'))
  } catch (err) {
    failed++
    console.log(`[FAIL] ${f} — invalid JSON: ${err instanceof Error ? err.message : String(err)}`)
    continue
  }
  const r = validateSeed(raw)
  totalWarnings += r.warnings.length
  if (r.errors.length) {
    failed++
    console.log(`[FAIL] ${f}`)
    for (const e of r.errors) console.log(`         ✗ ${e}`)
  } else {
    const cats = r.seed?.categories.length ?? 0
    const clues = r.seed?.categories.reduce((n, c) => n + c.clues.length, 0) ?? 0
    console.log(`[ OK ] ${f} — ${cats} cats, ${clues} clues${r.warnings.length ? `, ${r.warnings.length} warn` : ''}`)
  }
  for (const w of r.warnings) console.log(`         ! ${w}`)
}

console.log(`\n${files.length} files · ${failed} failing · ${totalWarnings} warnings`)
process.exit(failed ? 1 : 0)
