import { el } from '../lib/dom'
import { state, findClue, selectClue } from '../state'

// The presentation surface — what the host flips to so the room can see
// the board or the active clue. Never shows the correct response unless
// the host has explicitly revealed it.

export function renderBoard(): HTMLElement {
  const root = el('div', { class: 'board-screen' })

  if (state.phase === 'final') {
    return renderFinalBoard(root)
  }

  // A clue is open → show it big.
  if (state.selectedClueId != null) {
    const found = findClue(state.selectedClueId)
    if (found) {
      root.appendChild(
        el(
          'div',
          { class: 'clue-stage' },
          el('div', { class: 'clue-stage-cat', text: `${found.category.name} · $${found.clue.value}` }),
          el('div', { class: 'clue-stage-text', text: found.clue.clue }),
          state.responseRevealed
            ? el('div', { class: 'clue-stage-response', text: found.clue.response })
            : el('div', { class: 'clue-stage-hint', text: 'Answer when ready…' })
        )
      )
      return root
    }
  }

  // Otherwise show the grid.
  root.appendChild(renderGrid(false))
  return root
}

export function renderGrid(interactive: boolean): HTMLElement {
  const game = state.game!
  const grid = el('div', { class: 'board-grid', style: `--cols:${game.categories.length}` })

  for (const cat of game.categories) {
    grid.appendChild(el('div', { class: 'cat-head', text: cat.name }))
  }
  // Clues are laid out row-major by ascending value. We assume each
  // category has the same value ladder (the standard 5-row board); if a
  // category is short, its missing cells render blank.
  const maxRows = Math.max(...game.categories.map((c) => c.clues.length))
  for (let row = 0; row < maxRows; row++) {
    for (const cat of game.categories) {
      const clue = cat.clues[row]
      if (!clue) {
        grid.appendChild(el('div', { class: 'cell blank' }))
        continue
      }
      const spent = state.spent.has(clue.id)
      const selected = clue.id === state.selectedClueId
      const cell = el('div', {
        class: ['cell', spent ? 'spent' : '', selected ? 'selected' : '', interactive && !spent ? 'clickable' : ''].filter(Boolean).join(' '),
        text: spent ? '' : `$${clue.value}`,
        onclick: interactive && !spent ? () => selectClue(clue.id) : undefined
      })
      grid.appendChild(cell)
    }
  }
  return grid
}

function renderFinalBoard(root: HTMLElement): HTMLElement {
  const final = state.game!.final!
  const f = state.final!
  const stage = el('div', { class: 'clue-stage final' })
  stage.appendChild(el('div', { class: 'clue-stage-cat', text: `FINAL · ${final.category}` }))

  if (f.stage === 'wager') {
    stage.appendChild(el('div', { class: 'clue-stage-text', text: 'Make your wagers…' }))
  } else {
    stage.appendChild(el('div', { class: 'clue-stage-text', text: final.clue }))
    if (f.stage === 'response') {
      stage.appendChild(el('div', { class: 'clue-stage-response', text: final.response }))
    } else {
      stage.appendChild(el('div', { class: 'clue-stage-hint', text: 'Write your answers…' }))
    }
  }
  root.appendChild(stage)
  return root
}
