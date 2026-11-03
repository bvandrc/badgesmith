export type RepoCounts = { commits: number; prs: number }

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
  const last = res.headers.get('link')?.match(/[?&]page=(\d+)>; rel="last"/)
  return last ? Number(last[1]) : ((await res.json()) as unknown[]).length
}

/** A repo's total commits and pull requests. Throws if either call fails. */
export const fetchRepoCounts = async (
  repo: string,
  token?: string
): Promise<RepoCounts> => {
  const headers: Record<string, string> = {
    'user-agent': 'multi-icon-badge',
    accept: 'application/vnd.github+json',
  }
  if (token) {
    headers.authorization = `Bearer ${token}`
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
