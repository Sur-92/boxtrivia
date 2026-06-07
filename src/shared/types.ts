// ─── Shared types: the contract between main (DB/IPC) and renderer ───
//
// The SQLite database is the *content* store: games, categories, clues,
// and the Final round. Live match state (which clues are spent, player
// scores, wagers) is held in renderer memory for the duration of a game
// night and never persisted — a game definition can be replayed any
// number of times.

/** A game summary row (no nested categories/clues). */
export interface GameSummary {
  id: number
  title: string
  category_count: number
  clue_count: number
  has_final: number // 0 | 1
  created_at: string
}

/** A single clue cell on the board. */
export interface Clue {
  id: number
  category_id: number
  value: number
  /** The prompt the host reads aloud / shows on the board (Jeopardy "answer"). */
  clue: string
  /** The correct response (Jeopardy "question"), shown only to the host. */
  response: string
  position: number
}

/** A board column. */
export interface Category {
  id: number
  game_id: number
  name: string
  position: number
  clues: Clue[]
}

/** The Final round (optional per game). */
export interface FinalRound {
  category: string
  clue: string
  response: string
}

/** A fully-hydrated game ready to play. */
export interface GameFull {
  id: number
  title: string
  created_at: string
  categories: Category[]
  final: FinalRound | null
}

/** Result of importing a JSON game file. */
export interface ImportResult {
  ok: boolean
  game?: GameSummary
  /** Blocking rule violations (present when ok = false). Reports all at once. */
  errors?: string[]
  /** Non-blocking quality flags (may be present even when ok = true). */
  warnings?: string[]
}

// ─── The JSON seed file shape (what users drop in to author a game) ───

export interface SeedClue {
  value: number
  clue: string
  response: string
}

export interface SeedCategory {
  name: string
  clues: SeedClue[]
}

export interface SeedGame {
  title: string
  categories: SeedCategory[]
  final?: FinalRound
}

// ─── The preload-exposed API (window.boxtrivia) ───

export interface BoxTriviaApi {
  games: {
    list: () => Promise<GameSummary[]>
    get: (id: number) => Promise<GameFull | null>
    /** Opens a file picker, parses + inserts a JSON game, returns the result. */
    import: () => Promise<ImportResult>
    /** Imports from an in-memory seed object (used by the bundled sample). */
    importSeed: (seed: SeedGame) => Promise<ImportResult>
    delete: (id: number) => Promise<void>
  }
  clues: {
    /** Permanently update a clue's prompt and/or response in the database. */
    update: (id: number, patch: { clue?: string; response?: string }) => Promise<Clue>
  }
  app: {
    version: () => Promise<string>
  }
}

declare global {
  interface Window {
    boxtrivia: BoxTriviaApi
  }
}
