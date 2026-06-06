import { dialog } from 'electron'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { getDb } from './db'
import { validateSeed } from './validate'
import type {
  GameSummary, GameFull, Category, Clue, ImportResult, SeedGame
} from '@shared/types'

// ─── Reads ───

export function listGames(): GameSummary[] {
  return getDb()
    .prepare(
      `SELECT
         g.id,
         g.title,
         (SELECT COUNT(*) FROM categories c WHERE c.game_id = g.id) AS category_count,
         (SELECT COUNT(*) FROM clues cl
            JOIN categories c ON c.id = cl.category_id
           WHERE c.game_id = g.id) AS clue_count,
         (g.final_clue IS NOT NULL AND g.final_response IS NOT NULL) AS has_final,
         g.created_at
       FROM games g
       ORDER BY g.created_at DESC, g.id DESC`
    )
    .all() as GameSummary[]
}

export function getGame(id: number): GameFull | null {
  const db = getDb()
  const game = db
    .prepare('SELECT id, title, final_category, final_clue, final_response, created_at FROM games WHERE id = ?')
    .get(id) as
    | { id: number; title: string; final_category: string | null; final_clue: string | null; final_response: string | null; created_at: string }
    | undefined
  if (!game) return null

  const cats = db
    .prepare('SELECT id, game_id, name, position FROM categories WHERE game_id = ? ORDER BY position, id')
    .all(id) as Omit<Category, 'clues'>[]

  const clueStmt = db.prepare(
    'SELECT id, category_id, value, clue, response, position FROM clues WHERE category_id = ? ORDER BY value, position, id'
  )

  const categories: Category[] = cats.map((c) => ({
    ...c,
    clues: clueStmt.all(c.id) as Clue[]
  }))

  const hasFinal = game.final_clue != null && game.final_response != null
  return {
    id: game.id,
    title: game.title,
    created_at: game.created_at,
    categories,
    final: hasFinal
      ? {
          category: game.final_category ?? '',
          clue: game.final_clue ?? '',
          response: game.final_response ?? ''
        }
      : null
  }
}

export function deleteGame(id: number): void {
  // ON DELETE CASCADE removes categories + clues.
  getDb().prepare('DELETE FROM games WHERE id = ?').run(id)
}

// ─── Writes (seed import) ───

/** Insert a validated seed as a new game, atomically. Returns its summary. */
export function insertSeed(seed: SeedGame): GameSummary {
  const db = getDb()
  const insertGame = db.prepare(
    'INSERT INTO games (title, final_category, final_clue, final_response) VALUES (?, ?, ?, ?)'
  )
  const insertCat = db.prepare('INSERT INTO categories (game_id, name, position) VALUES (?, ?, ?)')
  const insertClue = db.prepare(
    'INSERT INTO clues (category_id, value, clue, response, position) VALUES (?, ?, ?, ?, ?)'
  )

  const tx = db.transaction((s: SeedGame) => {
    const gameInfo = insertGame.run(
      s.title,
      s.final?.category ?? null,
      s.final?.clue ?? null,
      s.final?.response ?? null
    )
    const gameId = Number(gameInfo.lastInsertRowid)
    s.categories.forEach((cat, ci) => {
      const catInfo = insertCat.run(gameId, cat.name, ci)
      const catId = Number(catInfo.lastInsertRowid)
      cat.clues.forEach((cl, li) => {
        insertClue.run(catId, cl.value, cl.clue, cl.response, li)
      })
    })
    return gameId
  })

  const id = tx(seed) as number
  return listGames().find((g) => g.id === id)!
}

/** Validate then (only if clean) insert. Shared by file + in-memory import paths. */
function validateAndInsert(raw: unknown): ImportResult {
  const { seed, errors, warnings } = validateSeed(raw)
  if (errors.length || !seed) {
    return { ok: false, errors, warnings }
  }
  const game = insertSeed(seed)
  return { ok: true, game, warnings }
}

/** Open a file picker, read + validate + insert a JSON game. */
export async function importGameFromFile(): Promise<ImportResult> {
  const result = await dialog.showOpenDialog({
    title: 'Import Trivia Game',
    properties: ['openFile'],
    filters: [{ name: 'Trivia Game (JSON)', extensions: ['json'] }]
  })
  if (result.canceled || result.filePaths.length === 0) {
    // No errors → the renderer treats this as a silent no-op.
    return { ok: false, errors: [], warnings: [] }
  }
  const filePath = result.filePaths[0]!
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return { ok: false, errors: [`${basename(filePath)}: not valid JSON — ${reason}`], warnings: [] }
  }
  return validateAndInsert(parsed)
}

/** Import directly from an in-memory seed object (bundled sample game). */
export function importSeedObject(raw: unknown): ImportResult {
  return validateAndInsert(raw)
}
