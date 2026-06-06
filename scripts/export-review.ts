// Export every bundled board to a single human-readable Markdown file for
// review (e.g. by another AI). Reads games/*.json directly.
//   node scripts/export-review.ts > review-all-games.md

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { SeedGame } from '../src/shared/types.ts'

const here = dirname(fileURLToPath(import.meta.url))
const gamesDir = join(here, '../games')

const lines: string[] = ['# Box Trivia — All Boards (review copy)', '']

for (const file of readdirSync(gamesDir).filter((f) => f.endsWith('.json')).sort()) {
  const g = JSON.parse(readFileSync(join(gamesDir, file), 'utf-8')) as SeedGame
  lines.push(`## ${g.title}`, '')
  for (const cat of g.categories) {
    lines.push(`### ${cat.name}`)
    for (const cl of [...cat.clues].sort((a, b) => a.value - b.value)) {
      lines.push(`- **$${cl.value}** — ${cl.clue}  \n  → ${cl.response}`)
    }
    lines.push('')
  }
  if (g.final) {
    lines.push(`### FINAL — ${g.final.category}`)
    lines.push(`- ${g.final.clue}  \n  → ${g.final.response}`, '')
  }
  lines.push('---', '')
}

process.stdout.write(lines.join('\n'))
