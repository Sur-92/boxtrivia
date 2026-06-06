# Trivia Authoring Rules

Authoritative guardrails for creating new Box Trivia games. These are
enforced at import time by `validateSeed()` in `src/main/games.ts`; this
document is the canonical reference for what's allowed and why.

Import is **strict**: any 🔴 rule below blocks the import and the game is
not saved. The importer reports **every** violation at once, so you fix
them in a single pass. 🟡 rules are applied silently. 🟢 rules let the
game through but surface a warning.

---

## Tiers

- 🔴 **Reject** — import fails; nothing is written to the database.
- 🟡 **Normalize** — silently corrected on import.
- 🟢 **Warn** — game imports; a non-blocking warning is shown.

---

## Rule 1 — A game has a title 🔴
`title` is required, non-empty after trimming, and at most **80**
characters.

## Rule 2 — A board has 2–8 categories 🔴
`categories` is a non-empty array with between **2 and 8** entries. Each
category has a non-empty `name` of at most **60** characters.

## Rule 3 — A category has 1–8 clues 🔴
Each category's `clues` array has between **1 and 8** entries. The
standard board is 5.

## Rule 4 — Clue values are positive integers 🔴
Each clue `value` is an integer greater than 0 (e.g. 200, 400). No
decimals, zero, or negatives.

## Rule 5 — No duplicate value within a category 🔴
A category may not contain two clues of the same value — there's nowhere
to place the second cell.

## Rule 6 — Uniform value ladder across categories 🔴
**Every category must share the identical set of values.** If the first
category is 200/400/600/800/1000, all categories must be exactly that.
This guarantees a clean rectangular board with no blank cells. (It also
implies every category has the same number of clues.)

## Rule 7 — Clue and response are present and bounded 🔴
Each clue has a non-empty `clue` (the prompt the host reads / the room
sees) of at most **300** characters, and a non-empty `response` (the
answer) of at most **150** characters.

## Rule 8 — No duplicate clue text in a game 🔴
The same `clue` text may not appear twice anywhere in the game
(compared case-insensitively, whitespace-normalized). Usually a
copy-paste slip.

## Rule 9 — A Final round, if present, is complete 🔴
The `final` key is optional. If present, it must have a non-empty `clue`
and `response`; `category` is recommended. Omit the whole key for a
board-only game.

## Rule 10 — Whitespace and ordering are normalized 🟡
Leading/trailing whitespace is trimmed from all text. Clues are sorted
by ascending value and categories by file order; `position` is assigned
automatically. You don't need to pre-sort anything.

## Rule 11 — Responses should be phrased as a question 🟢
For full Jeopardy flavor, a `response` should start with an
interrogative ("Who is…", "What are…", "Where is…") and contain a `?`.
Responses that don't match import fine but are flagged with a warning.

---

## Out of scope (runtime, not authoring)

- **Players**: a match supports **1–5** players, enforced at game start
  (not in the game file). Player names are never stored in the database.
- **Scores / spent clues / wagers**: live match state, held in memory,
  never persisted.

---

## Minimal valid example

```json
{
  "title": "Two-by-Two Demo",
  "categories": [
    { "name": "Colors", "clues": [
      { "value": 200, "clue": "The color of a clear daytime sky.", "response": "What is blue?" },
      { "value": 400, "clue": "The color made by mixing blue and yellow.", "response": "What is green?" }
    ]},
    { "name": "Numbers", "clues": [
      { "value": 200, "clue": "The number of sides on a triangle.", "response": "What is three?" },
      { "value": 400, "clue": "A baker's dozen.", "response": "What is thirteen?" }
    ]}
  ]
}
```

Both categories share the ladder `[200, 400]` (Rule 6), values are
positive integers (Rule 4), no duplicates (Rules 5, 8), and every
response is a question (Rule 11). `final` is omitted, which is allowed
(Rule 9).
