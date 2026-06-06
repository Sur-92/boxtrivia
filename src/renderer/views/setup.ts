import { el } from '../lib/dom'
import { SAMPLE_GAME } from '../lib/sample-game'
import {
  state,
  importGame,
  importSampleGame,
  deleteGame,
  selectGame,
  setPlayerName,
  startMatch
} from '../state'

export function renderSetup(): HTMLElement {
  const root = el('div', { class: 'setup' })

  root.appendChild(
    el(
      'header',
      { class: 'setup-head' },
      el('h1', { class: 'logo', text: 'BOX TRIVIA' }),
      el('p', { class: 'tagline', text: 'A Jeopardy-style host console. You ask, they answer, you run the board.' })
    )
  )

  const grid = el('div', { class: 'setup-grid' })

  // ── Game picker ──
  const gamesPanel = el('section', { class: 'panel' }, el('h2', { text: '1 · Choose a game' }))

  if (state.games.length === 0) {
    gamesPanel.appendChild(
      el('p', { class: 'muted', text: 'No games yet. Import a JSON board or load the sample to get started.' })
    )
  } else {
    const list = el('ul', { class: 'game-list' })
    for (const g of state.games) {
      const selected = g.id === state.selectedGameId
      const item = el(
        'li',
        { class: selected ? 'game-item selected' : 'game-item', onclick: () => selectGame(g.id) },
        el('div', { class: 'game-item-main' },
          el('span', { class: 'game-title', text: g.title }),
          el('span', {
            class: 'game-meta',
            text: `${g.category_count} categories · ${g.clue_count} clues${g.has_final ? ' · Final' : ''}`
          })
        ),
        el('button', {
          class: 'icon-btn danger',
          title: 'Delete game',
          text: '✕',
          onclick: (e: Event) => {
            e.stopPropagation()
            if (confirm(`Delete "${g.title}"? This removes it from the database.`)) void deleteGame(g.id)
          }
        })
      )
      list.appendChild(item)
    }
    gamesPanel.appendChild(list)
  }

  const importRow = el(
    'div',
    { class: 'btn-row' },
    el('button', { class: 'btn', text: 'Import JSON…', onclick: () => void importGame() }),
    el('button', { class: 'btn ghost', text: 'Load sample game', onclick: () => void importSampleGame(SAMPLE_GAME) })
  )
  gamesPanel.appendChild(importRow)

  if (state.setupError) {
    gamesPanel.appendChild(el('p', { class: 'error', text: state.setupError }))
  }

  // ── Players ──
  const playersPanel = el('section', { class: 'panel' }, el('h2', { text: '2 · Players (up to 5)' }))
  const playersList = el('div', { class: 'players-inputs' })
  for (let i = 0; i < 5; i++) {
    const input = el('input', {
      class: 'player-input',
      type: 'text',
      placeholder: `Player ${i + 1}`,
      value: state.playerNames[i] ?? '',
      maxLength: 24,
      oninput: (e: Event) => setPlayerName(i, (e.target as HTMLInputElement).value)
    })
    playersList.appendChild(input)
  }
  playersPanel.appendChild(playersList)

  const startBtn = el('button', {
    class: 'btn primary big',
    text: state.loading ? 'Loading…' : 'Start Game ▶',
    disabled: state.loading || !state.selectedGameId,
    onclick: () => void startMatch()
  })
  playersPanel.appendChild(el('div', { class: 'btn-row' }, startBtn))

  grid.appendChild(gamesPanel)
  grid.appendChild(playersPanel)
  root.appendChild(grid)

  return root
}
