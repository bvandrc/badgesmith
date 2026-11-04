/**
 * The deployment's bindings and secrets.
 *
 * No provider needs anything yet. Each adds what it reads, optional, so a
 * deployment with nothing configured still serves every route — a provider
 * wanting a secret has to cope with its absence rather than refuse to run.
 */
export type Env = Record<string, never>
