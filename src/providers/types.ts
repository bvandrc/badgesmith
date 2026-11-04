import type { Env } from '../env.ts'

/** A source of live values for a fixed set of icons, served at `/<name>`. */
export type Provider = {
  /** The icons this provider renders, in order; `resolve` returns one value per icon. */
  readonly icons: readonly string[]
  /**
   * Reads this provider's own query params and looks the values up.
   *
   * Returns one value per icon, or null when the lookup could not complete —
   * the route then renders placeholders, so an embedded badge degrades rather
   * than breaking. Throws `BadRequestError` if the params themselves are bad,
   * which the route turns into a 400.
   */
  readonly resolve: (
    params: URLSearchParams,
    env: Env
  ) => Promise<readonly string[] | null>
}
