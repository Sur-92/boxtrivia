import { dialog } from 'electron'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { getDb } from './db'
import type {
  GameSummary, GameFull, Category, Clue, ImportResult, SeedGame, SeedCategory, SeedClue
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

/** Validate + coerce an untrusted parsed JSON object into a SeedGame. Throws on bad shape. */
export function validateSeed(raw: unknown): SeedGame {
  if (!raw || typeof raw !== 'object') throw new Error('File is not a JSON object.')
  const obj = raw as Record<string, unknown>

  const title = typeof obj.title === 'string' ? obj.title.trim() : ''
  if (!title) throw new Error('Missing "title".')

  if (!Array.isArray(obj.categories) || obj.categories.length === 0) {
    throw new Error('"categories" must be a non-empty array.')
  }

  const categories: SeedCategory[] = obj.categories.map((c, ci) => {
    if (!c || typeof c !== 'object') throw new Error(`Category #${ci + 1} is not an object.`)
    const cat = c as Record<string, unknown>
    const name = typeof cat.name === 'string' ? cat.name.trim() : ''
    if (!name) throw new Error(`Category #${ci + 1} is missing "name".`)
    if (!Array.isArray(cat.clues) || cat.clues.length === 0) {
      throw new Error(`Category "${name}" must have a non-empty "clues" array.`)
    }
    const clues: SeedClue[] = cat.clues.map((cl, li) => {
      if (!cl || typeof cl !== 'object') throw new Error(`Clue #${li + 1} in "${name}" is not an object.`)
      const clue = cl as Record<string, unknown>
      const value = Number(clue.value)
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Clue #${li + 1} in "${name}" has an invalid "value".`)
      }
      const text = typeof clue.clue === 'string' ? clue.clue.trim() : ''
      const response = typeof clue.response === 'string' ? clue.response.trim() : ''
      if (!text) throw new Error(`Clue #${li + 1} in "${name}" is missing "clue".`)
      if (!response) throw new Error(`Clue #${li + 1} in "${name}" is missing "response".`)
      return { value, clue: text, response }
    })
    return { name, clues }
  })

  let final: SeedGame['final']
  if (obj.final && typeof obj.final === 'object') {
    const f = obj.final as Record<string, unknown>
    const fClue = typeof f.clue === 'string' ? f.clue.trim() : ''
    const fResponse = typeof f.response === 'string' ? f.response.trim() : ''
    if (fClue && fResponse) {
      final = {
        category: typeof f.category === 'string' ? f.category.trim() : '',
        clue: fClue,
        response: fResponse
      }
    }
  }

  return { title, categories, final }
}

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

/** Open a file picker, read + validate + insert a JSON game. */
export async function importGameFromFile(): Promise<ImportResult> {
  const result = await dialog.showOpenDialog({
    title: 'Import Trivia Game',
    properties: ['openFile'],
    filters: [{ name: 'Trivia Game (JSON)', extensions: ['json'] }]
  })
  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false, error: 'canceled' }
  }
  const filePath = result.filePaths[0]!
  try {
    const text = readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(text)
    const seed = validateSeed(parsed)
    const game = insertSeed(seed)
    return { ok: true, game }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `${basename(filePath)}: ${reason}` }
  }
}

/** Import directly from an in-memory seed object (bundled sample game). */
export function importSeedObject(raw: unknown): ImportResult {
  try {
    const seed = validateSeed(raw)
    const game = insertSeed(seed)
    return { ok: true, game }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
