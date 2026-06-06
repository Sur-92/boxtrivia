import { state, onChange, render, loadGames, toggleView } from './state'
import { renderSetup } from './views/setup'
import { renderBoard } from './views/board'
import { renderControl } from './views/control'

const root = document.getElementById('app')!

function draw(): void {
  let view: HTMLElement
  if (state.screen === 'setup') {
    view = renderSetup()
  } else if (state.view === 'board') {
    view = renderBoard()
  } else {
    view = renderControl()
  }
  root.replaceChildren(view)
}

onChange(draw)

// Space toggles board/control during a match — the "show the room" gesture.
window.addEventListener('keydown', (e) => {
  if (state.screen !== 'match') return
  if (e.code === 'Space') {
    const target = e.target as HTMLElement | null
    const tag = target?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    e.preventDefault()
    toggleView()
  }
})

// Initial paint, then hydrate the game list from the DB.
draw()
void loadGames()
render()
