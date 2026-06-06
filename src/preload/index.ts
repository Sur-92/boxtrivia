import { contextBridge, ipcRenderer } from 'electron'
import type { BoxTriviaApi, GameSummary, GameFull, ImportResult, SeedGame } from '@shared/types'

const api: BoxTriviaApi = {
  games: {
    list: () => ipcRenderer.invoke('games:list') as Promise<GameSummary[]>,
    get: (id: number) => ipcRenderer.invoke('games:get', id) as Promise<GameFull | null>,
    import: () => ipcRenderer.invoke('games:import') as Promise<ImportResult>,
    importSeed: (seed: SeedGame) => ipcRenderer.invoke('games:importSeed', seed) as Promise<ImportResult>,
    delete: (id: number) => ipcRenderer.invoke('games:delete', id) as Promise<void>
  },
  app: {
    version: () => ipcRenderer.invoke('app:version') as Promise<string>
  }
}

contextBridge.exposeInMainWorld('boxtrivia', api)
