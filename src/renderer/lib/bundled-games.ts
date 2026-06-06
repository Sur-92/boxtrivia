/// <reference types="vite/client" />
import type { SeedGame } from '@shared/types'

// Pull every board in games/*.json into the bundle at build time so the
// app ships with them and can import them all with one click. Validation
// still runs in the main process on import — these are not trusted blindly.
const modules = import.meta.glob('../../../games/*.json', {
  eager: true,
  import: 'default'
}) as Record<string, SeedGame>

export const BUNDLED_GAMES: SeedGame[] = Object.keys(modules)
  .sort()
  .map((path) => modules[path]!)
