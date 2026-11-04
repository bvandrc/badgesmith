/**
 * The deployment's bindings and secrets.
 *
 * Each provider declares what it needs here; all of it is optional so the
 * generic `/` route works on a deployment with nothing configured.
 */
export type Env = {
  /** raises the GitHub API rate limit for the `github` provider */
  GITHUB_TOKEN?: string
}
