import type { Provider } from './types.ts'

/**
 * Every provider, keyed by the path it is served at.
 *
 * Adding one is a module in this folder and an entry here — the route that
 * dispatches through it needs no change.
 */
const PROVIDERS = {} satisfies Record<string, Provider>

// a Map, so looking up an arbitrary path is a miss rather than an index cast
const BY_PATH: ReadonlyMap<string, Provider> = new Map(
  Object.entries(PROVIDERS)
)

/** The provider served at the given path segment, or undefined if none is. */
export const findProvider = (path: string) => BY_PATH.get(path)
