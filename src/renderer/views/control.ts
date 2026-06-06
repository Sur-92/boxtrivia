import { el } from '../lib/dom'
import { renderGrid } from './board'
import {
  state,
  findClue,
  allCluesSpent,
  toggleView,
  revealResponse,
  awardCorrect,
  awardWrong,
  dismissClue,
  closeClue,
  adjustScore,
  startFinal,
  setWager,
  finalRevealClue,
  finalRevealResponse,
  finalMark,
  endMatch
} from '../state'

// The host's private cockpit: the board with values, the active clue
// WITH its answer, scoring controls, and the Final Jeopardy flow.

export function renderControl(): HTMLElement {
  const root = el('div', { class: 'control-screen' })
  root.appendChild(renderTopBar())

  const body = el('div', { class: 'control-body' })
  body.appendChild(state.phase === 'final' ? renderFinalPanel() : renderMainPanel())
  body.appendChild(renderScoreboard())
  root.appendChild(body)

  return root
}

function renderTopBar(): HTMLElement {
  return el(
    'div',
    { class: 'control-top' },
    el('span', { class: 'control-title', text: state.game!.title }),
    el(
      'div',
      { class: 'control-top-actions' },
      el('button', {
        class: 'btn',
        text: state.view === 'board' ? 'Host Controls (Space)' : 'Show Board (Space)',
        onclick: () => toggleView()
      }),
      el('button', { class: 'btn ghost', text: 'End Game', onclick: () => { if (confirm('End this game and return to setup?')) endMatch() } })
    )
  )
}

function renderMainPanel(): HTMLElement {
  const panel = el('div', { class: 'control-main' })

  if (state.selectedClueId != null) {
    panel.appendChild(renderCluePanel())
  } else {
    const hint = allCluesSpent()
      ? 'All clues played. Head to Final Jeopardy →'
      : 'Click a clue to begin. Press Space to flip the board toward the room.'
    panel.appendChild(el('p', { class: 'control-hint', text: hint }))
    panel.appendChild(renderGrid(true))
    if (state.game!.final) {
      panel.appendChild(
        el('div', { class: 'btn-row' },
          el('button', {
            class: allCluesSpent() ? 'btn primary' : 'btn ghost',
            text: 'Go to Final Jeopardy →',
            onclick: () => startFinal()
          })
        )
      )
    }
  }
  return panel
}

function renderCluePanel(): HTMLElement {
  const found = findClue(state.selectedClueId!)!
  const panel = el('div', { class: 'clue-panel' })

  panel.appendChild(
    el('div', { class: 'clue-panel-head' },
      el('span', { class: 'clue-panel-cat', text: found.category.name }),
      el('span', { class: 'clue-panel-value', text: `$${found.clue.value}` })
    )
  )
  panel.appendChild(el('div', { class: 'clue-panel-clue', text: found.clue.clue }))

  if (state.responseRevealed) {
    panel.appendChild(el('div', { class: 'clue-panel-response' },
      el('span', { class: 'label', text: 'Correct response' }),
      el('span', { class: 'value', text: found.clue.response })
    ))
  } else {
    panel.appendChild(
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn primary', text: 'Reveal Response', onclick: () => revealResponse() })
      )
    )
  }

  // Scoring row — always visible so a host can score before/after reveal.
  const scoring = el('div', { class: 'scoring' })
  scoring.appendChild(el('div', { class: 'scoring-label', text: 'Who answered?' }))
  for (const p of state.players) {
    scoring.appendChild(
      el('div', { class: 'scoring-row' },
        el('span', { class: 'scoring-name', text: p.name }),
        el('button', { class: 'btn correct', text: `+${found.clue.value}`, title: 'Correct', onclick: () => awardCorrect(p.id) }),
        el('button', { class: 'btn wrong', text: `−${found.clue.value}`, title: 'Wrong (clue stays open)', onclick: () => awardWrong(p.id) })
      )
    )
  }
  panel.appendChild(scoring)

  panel.appendChild(
    el('div', { class: 'btn-row' },
      el('button', { class: 'btn', text: 'No one — clear clue', onclick: () => dismissClue() }),
      el('button', { class: 'btn ghost', text: 'Cancel', onclick: () => closeClue() })
    )
  )
  return panel
}

function renderScoreboard(): HTMLElement {
  const board = el('aside', { class: 'scoreboard' }, el('h3', { text: 'Scores' }))
  const sorted = [...state.players].sort((a, b) => b.score - a.score)
  for (const p of sorted) {
    board.appendChild(
      el('div', { class: 'score-card' },
        el('div', { class: 'score-top' },
          el('span', { class: 'score-name', text: p.name }),
          el('span', { class: p.score < 0 ? 'score-val neg' : 'score-val', text: `$${p.score}` })
        ),
        el('div', { class: 'score-adjust' },
          el('button', { class: 'icon-btn', text: '−100', onclick: () => adjustScore(p.id, -100) }),
          el('button', { class: 'icon-btn', text: '+100', onclick: () => adjustScore(p.id, 100) })
        )
      )
    )
  }
  return board
}

// ─── Final Jeopardy cockpit ───

function renderFinalPanel(): HTMLElement {
  const final = state.game!.final!
  const f = state.final!
  const panel = el('div', { class: 'control-main' })

  panel.appendChild(
    el('div', { class: 'clue-panel-head' },
      el('span', { class: 'clue-panel-cat', text: `FINAL · ${final.category}` }),
      el('span', { class: 'clue-panel-value', text: f.stage === 'wager' ? 'Wagers' : '' })
    )
  )

  if (f.stage === 'wager') {
    panel.appendChild(el('p', { class: 'control-hint', text: 'Enter each player’s secret wager (max = their score).' }))
    for (const p of state.players) {
      const max = Math.max(0, p.score)
      panel.appendChild(
        el('div', { class: 'wager-row' },
          el('span', { class: 'scoring-name', text: `${p.name} ($${p.score})` }),
          el('input', {
            class: 'wager-input',
            type: 'number',
            min: 0,
            max,
            value: String(f.wagers[p.id] ?? 0),
            oninput: (e: Event) => setWager(p.id, Number((e.target as HTMLInputElement).value) || 0)
          })
        )
      )
    }
    panel.appendChild(
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn primary', text: 'Reveal Clue →', onclick: () => finalRevealClue() })
      )
    )
    return panel
  }

  panel.appendChild(el('div', { class: 'clue-panel-clue', text: final.clue }))

  if (f.stage === 'response') {
    panel.appendChild(el('div', { class: 'clue-panel-response' },
      el('span', { class: 'label', text: 'Correct response' }),
      el('span', { class: 'value', text: final.response })
    ))
    panel.appendChild(el('div', { class: 'scoring-label', text: 'Mark each player:' }))
    for (const p of state.players) {
      const result = f.results[p.id]
      panel.appendChild(
        el('div', { class: 'scoring-row' },
          el('span', { class: 'scoring-name', text: `${p.name} · wager $${f.wagers[p.id] ?? 0}` }),
          el('button', { class: result === 'correct' ? 'btn correct active' : 'btn correct', text: 'Correct', onclick: () => finalMark(p.id, true) }),
          el('button', { class: result === 'wrong' ? 'btn wrong active' : 'btn wrong', text: 'Wrong', onclick: () => finalMark(p.id, false) })
        )
      )
    }
  } else {
    panel.appendChild(
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn primary', text: 'Reveal Response', onclick: () => finalRevealResponse() })
      )
    )
  }
  return panel
}
