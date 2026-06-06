// ─── Central app state + actions ───────────────────────────────
//
// The DB holds game content; everything here is ephemeral match state
// for the current trivia night. Actions mutate `state` then call
// render() to repaint. Views are pure read functions of `state`.

import type { GameFull, GameSummary } from '@shared/types'

export interface Player {
  id: number
  name: string
  score: number
}

export type Screen = 'setup' | 'match'
export type MatchView = 'board' | 'control'
export type Phase = 'board' | 'final'

export interface FinalState {
  stage: 'wager' | 'clue' | 'response'
  wagers: Record<number, number>
  results: Record<number, 'correct' | 'wrong' | null>
}

export interface AppState {
  screen: Screen
  // setup
  games: GameSummary[]
  selectedGameId: number | null
  playerNames: string[]
  setupError: string | null
  loading: boolean
  // match
  game: GameFull | null
  players: Player[]
  view: MatchView
  phase: Phase
  spent: Set<number>
  selectedClueId: number | null
  responseRevealed: boolean
  final: FinalState | null
}

export const state: AppState = {
  screen: 'setup',
  games: [],
  selectedGameId: null,
  playerNames: ['', '', '', '', ''],
  setupError: null,
  loading: false,
  game: null,
  players: [],
  view: 'control',
  phase: 'board',
  spent: new Set(),
  selectedClueId: null,
  responseRevealed: false,
  final: null
}

let listener: (() => void) | null = null
export function onChange(cb: () => void): void {
  listener = cb
}
export function render(): void {
  listener?.()
}

// ─── Lookups ───

export function findClue(id: number) {
  if (!state.game) return null
  for (const cat of state.game.categories) {
    const clue = cat.clues.find((c) => c.id === id)
    if (clue) return { clue, category: cat }
  }
  return null
}

export function allCluesSpent(): boolean {
  if (!state.game) return false
  const total = state.game.categories.reduce((n, c) => n + c.clues.length, 0)
  return total > 0 && state.spent.size >= total
}

// ─── Setup actions ───

export async function loadGames(): Promise<void> {
  state.games = await window.boxtrivia.games.list()
  if (state.selectedGameId && !state.games.some((g) => g.id === state.selectedGameId)) {
    state.selectedGameId = null
  }
  if (!state.selectedGameId && state.games.length) {
    state.selectedGameId = state.games[0]!.id
  }
  render()
}

export async function importGame(): Promise<void> {
  state.setupError = null
  const result = await window.boxtrivia.games.import()
  if (!result.ok) {
    if (result.error && result.error !== 'canceled') state.setupError = result.error
    render()
    return
  }
  state.selectedGameId = result.game!.id
  await loadGames()
}

export async function importSampleGame(seed: unknown): Promise<void> {
  state.setupError = null
  const result = await window.boxtrivia.games.importSeed(seed as never)
  if (!result.ok) {
    state.setupError = result.error ?? 'Import failed.'
    render()
    return
  }
  state.selectedGameId = result.game!.id
  await loadGames()
}

export async function deleteGame(id: number): Promise<void> {
  await window.boxtrivia.games.delete(id)
  await loadGames()
}

export function selectGame(id: number): void {
  state.selectedGameId = id
  render()
}

export function setPlayerName(index: number, name: string): void {
  state.playerNames[index] = name
  // no render: called on input; avoid clobbering the field's caret
}

export async function startMatch(): Promise<void> {
  state.setupError = null
  if (!state.selectedGameId) {
    state.setupError = 'Pick a game first.'
    render()
    return
  }
  const names = state.playerNames.map((n) => n.trim()).filter(Boolean)
  if (names.length < 1) {
    state.setupError = 'Enter at least one player.'
    render()
    return
  }
  state.loading = true
  render()
  const game = await window.boxtrivia.games.get(state.selectedGameId)
  state.loading = false
  if (!game) {
    state.setupError = 'Could not load that game.'
    render()
    return
  }
  state.game = game
  state.players = names.map((name, i) => ({ id: i, name, score: 0 }))
  state.spent = new Set()
  state.selectedClueId = null
  state.responseRevealed = false
  state.phase = 'board'
  state.view = 'control'
  state.final = null
  state.screen = 'match'
  render()
}

export function endMatch(): void {
  state.screen = 'setup'
  state.game = null
  state.players = []
  state.spent = new Set()
  state.selectedClueId = null
  state.responseRevealed = false
  state.phase = 'board'
  state.final = null
  render()
}

// ─── Match actions ───

export function toggleView(): void {
  state.view = state.view === 'board' ? 'control' : 'board'
  render()
}

export function setView(v: MatchView): void {
  state.view = v
  render()
}

export function selectClue(id: number): void {
  if (state.spent.has(id)) return
  state.selectedClueId = id
  state.responseRevealed = false
  render()
}

export function closeClue(): void {
  state.selectedClueId = null
  state.responseRevealed = false
  render()
}

export function revealResponse(): void {
  state.responseRevealed = true
  render()
}

function resolveClue(): void {
  if (state.selectedClueId != null) state.spent.add(state.selectedClueId)
  state.selectedClueId = null
  state.responseRevealed = false
  state.view = 'control'
  render()
}

export function awardCorrect(playerId: number): void {
  const found = state.selectedClueId != null ? findClue(state.selectedClueId) : null
  const player = state.players.find((p) => p.id === playerId)
  if (found && player) player.score += found.clue.value
  resolveClue()
}

export function awardWrong(playerId: number): void {
  const found = state.selectedClueId != null ? findClue(state.selectedClueId) : null
  const player = state.players.find((p) => p.id === playerId)
  if (found && player) player.score -= found.clue.value
  // a wrong answer does not resolve the clue — someone else may steal it
  render()
}

export function dismissClue(): void {
  resolveClue()
}

export function adjustScore(playerId: number, delta: number): void {
  const player = state.players.find((p) => p.id === playerId)
  if (player) player.score += delta
  render()
}

// ─── Final round ───

export function startFinal(): void {
  if (!state.game?.final) return
  state.phase = 'final'
  state.selectedClueId = null
  state.responseRevealed = false
  state.final = {
    stage: 'wager',
    wagers: Object.fromEntries(state.players.map((p) => [p.id, 0])),
    results: Object.fromEntries(state.players.map((p) => [p.id, null]))
  }
  state.view = 'control'
  render()
}

export function setWager(playerId: number, amount: number): void {
  if (!state.final) return
  const max = Math.max(0, state.players.find((p) => p.id === playerId)?.score ?? 0)
  state.final.wagers[playerId] = Math.max(0, Math.min(amount, Math.max(max, 0)))
  render()
}

export function finalRevealClue(): void {
  if (state.final) state.final.stage = 'clue'
  render()
}

export function finalRevealResponse(): void {
  if (state.final) state.final.stage = 'response'
  render()
}

export function finalMark(playerId: number, correct: boolean): void {
  if (!state.final) return
  const player = state.players.find((p) => p.id === playerId)
  const prev = state.final.results[playerId]
  const wager = state.final.wagers[playerId] ?? 0
  if (player) {
    // undo previous decision first so toggling is idempotent
    if (prev === 'correct') player.score -= wager
    else if (prev === 'wrong') player.score += wager
    if (correct) player.score += wager
    else player.score -= wager
  }
  state.final.results[playerId] = correct ? 'correct' : 'wrong'
  render()
}
