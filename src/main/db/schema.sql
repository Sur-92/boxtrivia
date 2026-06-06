-- Box Trivia content schema. Idempotent: CREATE IF NOT EXISTS only.
-- The DB stores game *definitions* (questions & answers). Live match
-- state (scores, spent clues) is never persisted.

CREATE TABLE IF NOT EXISTS games (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT    NOT NULL,
  final_category  TEXT,
  final_clue      TEXT,
  final_response  TEXT,
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id   INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name      TEXT    NOT NULL,
  position  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS clues (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id  INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  value        INTEGER NOT NULL,
  clue         TEXT    NOT NULL,
  response     TEXT    NOT NULL,
  position     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_categories_game ON categories(game_id);
CREATE INDEX IF NOT EXISTS idx_clues_category  ON clues(category_id);
