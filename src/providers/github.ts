import { regex as zRegex, string as zString } from 'zod/mini'

import { BadRequestError, CONTENT_TYPES, HEADERS } from '../http.ts'
import type { Provider } from './types.ts'

type RepoCounts = { commits: number; prs: number }

const zRepo = zString().check(zRegex(/^[\w.-]+\/[\w.-]+$/))

/**
 * Total number of items behind a paginated list endpoint.
 *
 * With per_page=1 the Link header's rel="last" page number *is* the total,
 * which avoids walking the pages.
 */
const total = async (url: string, headers: Record<string, string>) => {
  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} for ${url}`)
  }
  const last = res.headers
    .get(HEADERS.LINK)
    ?.match(/[?&]page=(\d+)>; rel="last"/)
  return last ? Number(last[1]) : ((await res.json()) as unknown[]).length
}

/** A repo's total commits and pull requests. Throws if either call fails. */
const fetchRepoCounts = async (
  repo: string,
  token?: string
): Promise<RepoCounts> => {
  const headers: Record<string, string> = {
    [HEADERS.USER_AGENT]: 'multi-icon-badge',
    [HEADERS.ACCEPT]: CONTENT_TYPES.GITHUB_JSON,
  }
  if (token) {
    headers[HEADERS.AUTHORIZATION] = `Bearer ${token}`
  }
  const [commits, prs] = await Promise.all([
    total(`https://api.github.com/repos/${repo}/commits?per_page=1`, headers),
    total(
      `https://api.github.com/repos/${repo}/pulls?state=all&per_page=1`,
      headers
    ),
  ])
  return { commits, prs }
}

/**
 * A GitHub repo's commit and pull request counts, read live from the API.
 *
 * Takes `?repo=owner/name`. Private repos aren't readable this way — pass
 * their numbers to the generic `/` route instead.
 */
export const GITHUB_PROVIDER: Provider = {
  icons: ['git-commit', 'git-pull-request'],
  resolve: async (params, env) => {
    const parsed = zRepo.safeParse(params.get('repo'))
    if (!parsed.success) {
      throw new BadRequestError('repo is required, e.g. ?repo=owner/name')
    }
    const repo = parsed.data
    const counts = await fetchRepoCounts(repo, env.GITHUB_TOKEN).catch(
      (error) => {
        console.warn(`counts failed for ${repo}: ${error}`)
        return null
      }
    )
    return counts ? [String(counts.commits), String(counts.prs)] : null
  },
}
