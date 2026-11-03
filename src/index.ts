import { fetchRepoCounts } from './github.ts'
import { ICONS } from './icons.ts'
import { type BadgeItem, renderBadge } from './render.ts'

export type Env = {
  /** optional; raises the GitHub API rate limit for the /github route */
  GITHUB_TOKEN?: string
}

const MAX_ITEMS = 6
const MAX_VALUE_LENGTH = 12
const HEX = /^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const REPO = /^[\w.-]+\/[\w.-]+$/
// values live in the URL, so a change is a new URL and a stale cache is harmless
const STATIC_CACHE_SECONDS = 604800
// the /github route's numbers move on their own, so it gets a short window
const LIVE_CACHE_SECONDS = 3600

const svgResponse = (body: string, cacheSeconds: number) =>
  new Response(body, {
    headers: {
      // GitHub's proxy sends X-Content-Type-Options: nosniff, so this has to be exact
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
    },
  })

const badRequest = (why: string) =>
  new Response(`${why}\n`, {
    status: 400,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })

/** Parses `items=icon:value,icon:value`, or returns the reason it is invalid. */
const parseItems = (raw: string | null) => {
  if (!raw) {
    return 'items is required, e.g. ?items=git-commit:370,git-pull-request:264'
  }
  const parts = raw.split(',')
  if (parts.length > MAX_ITEMS) {
    return `at most ${MAX_ITEMS} items`
  }
  const items: BadgeItem[] = []
  for (const part of parts) {
    const at = part.indexOf(':')
    if (at < 1) {
      return `malformed item "${part}" — expected icon:value`
    }
    const icon = part.slice(0, at)
    const value = part.slice(at + 1)
    if (!ICONS[icon]) {
      return `unknown icon "${icon}" — known: ${Object.keys(ICONS).join(', ')}`
    }
    if (!value || value.length > MAX_VALUE_LENGTH) {
      return `value for "${icon}" must be 1-${MAX_VALUE_LENGTH} characters`
    }
    items.push({ icon, value })
  }
  return items
}

/** Reads the shared appearance params, or returns the reason one is invalid. */
const parseStyle = (params: URLSearchParams) => {
  const style: {
    color?: string
    iconColor?: string
    textColor?: string
    height?: number
    radius?: number
  } = {}
  for (const key of ['color', 'iconColor', 'textColor'] as const) {
    const value = params.get(key)
    if (value !== null) {
      if (!HEX.test(value)) {
        return `${key} must be a 3- or 6-digit hex colour without '#'`
      }
      style[key] = value
    }
  }
  for (const key of ['height', 'radius'] as const) {
    const value = params.get(key)
    if (value !== null) {
      const n = Number(value)
      const max = key === 'height' ? 64 : 32
      if (!Number.isFinite(n) || n < 0 || n > max) {
        return `${key} must be a number between 0 and ${max}`
      }
      style[key] = n
    }
  }
  if (style.height !== undefined && style.height < 12) {
    return 'height must be at least 12'
  }
  return style
}

const handle = async (request: Request, env: Env, ctx: ExecutionContext) => {
  const url = new URL(request.url)
  const style = parseStyle(url.searchParams)
  if (typeof style === 'string') {
    return badRequest(style)
  }

  if (url.pathname === '/github') {
    const repo = url.searchParams.get('repo')
    if (!repo || !REPO.test(repo)) {
      return badRequest('repo is required, e.g. ?repo=owner/name')
    }
    const cached = await caches.default.match(request)
    if (cached) {
      return cached
    }
    // a failed lookup still renders, so a README never shows a broken image
    const counts = await fetchRepoCounts(repo, env.GITHUB_TOKEN).catch(
      (error) => {
        console.warn(`counts failed for ${repo}: ${error}`)
        return null
      }
    )
    const items: BadgeItem[] = [
      { icon: 'git-commit', value: counts ? String(counts.commits) : '?' },
      { icon: 'git-pull-request', value: counts ? String(counts.prs) : '?' },
    ]
    const res = svgResponse(
      renderBadge({ ...style, items }),
      counts ? LIVE_CACHE_SECONDS : 300
    )
    if (counts) {
      ctx.waitUntil(caches.default.put(request, res.clone()))
    }
    return res
  }

  if (url.pathname === '/') {
    const items = parseItems(url.searchParams.get('items'))
    if (typeof items === 'string') {
      return badRequest(items)
    }
    return svgResponse(renderBadge({ ...style, items }), STATIC_CACHE_SECONDS)
  }

  return new Response('not found\n', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}

export default {
  fetch: handle,
}
