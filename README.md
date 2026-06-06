# Box Trivia

A Jeopardy-style host console for running trivia nights. You (the host) drive
the game from a single window: pick clues, read them privately with the answer
in view, flip the board toward the room when you want players to see it, and
keep score for up to five players — through to a Final round with secret wagers.

Built with Electron + TypeScript, with questions and answers stored in SQLite.

## Running locally

```bash
npm run setup   # install deps + rebuild native better-sqlite3 for Electron
npm run dev     # launch in development
```

Then click **Load sample game** to play the bundled "Early 2000s Pop Animals"
board, or **Import JSON…** to load your own.

## How a game runs

1. **Setup** — choose a game, type in 1–5 player names, press **Start Game**.
2. **Host Controls** — the board shows dollar values; click a clue to open it.
   You see the clue *and* its correct response privately.
3. **Show Board** (or press **Space**) — flips the same window to the clean
   presentation board so the room can read the clue. Press Space again to come
   back to your controls.
4. **Score** — `+value` marks a player correct (and clears the clue); `−value`
   docks a player for a wrong guess but leaves the clue open for a steal. Use
   **No one** to retire a clue nobody got.
5. **Final** — when you're ready, **Go to Final Jeopardy**: enter each player's
   secret wager, reveal the clue, then mark each player correct/wrong to apply
   their wager.

The board, scoreboard, and "spent" clues are all live match state held in
memory — ending a game resets them, and any game can be replayed.

## Authoring games (JSON format)

Drop a `.json` file matching this shape and import it. See
[`games/early-2000s-pop-animals.json`](games/early-2000s-pop-animals.json) for a
full example.

```json
{
  "title": "My Trivia Night",
  "categories": [
    {
      "name": "Category Name",
      "clues": [
        { "value": 200, "clue": "The prompt you read aloud.", "response": "What is the answer?" }
      ]
    }
  ],
  "final": {
    "category": "Final Category",
    "clue": "The final prompt.",
    "response": "The final answer."
  }
}
```

- `value` is any positive number; clues render in ascending value per column.
- A standard board is 5–6 categories × 5 clues, but any size works.
- `final` is optional — omit it for a board-only game.
- `clue` is what the host reads / the room sees; `response` is the answer shown
  only to the host (phrase it as a question for full Jeopardy flavor).

Imported games are stored in a local SQLite database in your app data
directory (`boxtrivia.db`) and persist between launches.
