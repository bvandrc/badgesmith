/**
 * The deployment's bindings and secrets.
 *
 * Each provider adds what it reads, optional, so a deployment with nothing
 * configured still serves every route — a provider wanting a secret has to
 * cope with its absence rather than refuse to run.
 */
export type Env = {
  /** raises the GitHub API rate limit for the `github` provider */
  GITHUB_TOKEN?: string
}
