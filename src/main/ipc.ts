import { ipcMain, app } from 'electron'
import {
  listGames,
  getGame,
  deleteGame,
  updateClue,
  importGameFromFile,
  importSeedObject
} from './games'

export function registerIpc(): void {
  ipcMain.handle('games:list', () => listGames())
  ipcMain.handle('games:get', (_e, id: number) => getGame(id))
  ipcMain.handle('games:import', () => importGameFromFile())
  ipcMain.handle('games:importSeed', (_e, seed: unknown) => importSeedObject(seed))
  ipcMain.handle('games:delete', (_e, id: number) => deleteGame(id))
  ipcMain.handle('clues:update', (_e, id: number, patch: { clue?: string; response?: string }) =>
    updateClue(id, patch)
  )

  ipcMain.handle('app:version', () => app.getVersion())
}
