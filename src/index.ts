import type { Env } from './env.ts'
import { USAGE_PAGE } from './generated/usage-page.ts'
import { BadRequestError, CONTENT_TYPES, HEADERS } from './http.ts'
import { findProvider } from './providers/registry.ts'
import { parseItems, parseStyle } from './query-params.ts'
import { type BadgeItem, renderBadge } from './render.ts'

/**
 * How long an explicit-value badge may be cached: a week.
 *
 * Every value lives in the URL, so a change is a new URL and a cached
 * response can never go stale.
 */
const STATIC_CACHE_SECONDS = 604_800

/** How long a provider's looked-up values may be cached: an hour. */
const LIVE_CACHE_SECONDS = 3600

/**
 * How long a failed lookup may be cached: five minutes.
 *
 * Long enough to spare the upstream a hot loop, short enough that a badge
 * recovers on its own without anyone intervening.
 */
const FAILED_LOOKUP_CACHE_SECONDS = 300

/** What a provider renders in place of a value it could not look up. */
const UNKNOWN_VALUE = '?'

/**
 * How long the landing page may be cached: an hour.
 *
 * Deliberately not the week above. That reasoning turns on a badge's values
 * living in its URL, which the page's fixed URL cannot do — its content
 * changes on deploy, so a week-old copy would be stale.
 */
const PAGE_CACHE_SECONDS = 3600

const cacheHeaders = (contentType: string, cacheSeconds: number) => ({
  [HEADERS.CONTENT_TYPE]: contentType,
  [HEADERS.CACHE_CONTROL]: `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
})

const svgResponse = (body: string, cacheSeconds: number) =>
  new Response(body, { headers: cacheHeaders(CONTENT_TYPES.SVG, cacheSeconds) })

const htmlResponse = (body: string, cacheSeconds: number) =>
  new Response(body, {
    headers: cacheHeaders(CONTENT_TYPES.HTML, cacheSeconds),
  })

/**
 * The Worker runtime's edge cache and the bits of its context this uses.
 *
 * Declared structurally rather than taken from `@cloudflare/workers-types`,
 * because `index.test.ts` pulls this module into the test program, which runs
 * on node types and cannot also load workers types — their `URL` declarations
 * are incompatible.
 */
declare const caches: {
  readonly default: {
    match(request: Request): Promise<Response | undefined>
    put(request: Request, response: Response): Promise<void>
  }
}

type WaitUntil = { waitUntil(work: Promise<unknown>): void }

const handle = async (request: Request, env: Env, ctx: WaitUntil) => {
  try {
    const url = new URL(request.url)
    const style = parseStyle(url.searchParams)

    if (url.pathname === '/') {
      // a bare root is someone opening the worker in a browser, so it gets the
      // landing page. Any query at all means a badge was intended, and a bad
      // one earns the 400 rather than a page that looks like success.
      if ([...url.searchParams].length === 0) {
        return htmlResponse(USAGE_PAGE, PAGE_CACHE_SECONDS)
      }
      const items = parseItems(url.searchParams.get('items'))
      return svgResponse(renderBadge({ ...style, items }), STATIC_CACHE_SECONDS)
    }

    const provider = findProvider(url.pathname.slice(1))
    if (provider) {
      const cached = await caches.default.match(request)
      if (cached) {
        return cached
      }
      const values = await provider.resolve(url.searchParams, env)
      // a failed lookup still renders, so an embedded badge never breaks
      const items: BadgeItem[] = provider.icons.map((icon, at) => ({
        icon,
        value: values?.[at] ?? UNKNOWN_VALUE,
      }))
      const res = svgResponse(
        renderBadge({ ...style, items }),
        values ? LIVE_CACHE_SECONDS : FAILED_LOOKUP_CACHE_SECONDS
      )
      if (values) {
        ctx.waitUntil(caches.default.put(request, res.clone()))
      }
      return res
    }

    return new Response('not found\n', {
      status: 404,
      headers: { [HEADERS.CONTENT_TYPE]: CONTENT_TYPES.PLAIN_TEXT },
    })
  } catch (error) {
    if (error instanceof BadRequestError) {
      return new Response(`${error.message}\n`, {
        status: 400,
        headers: { [HEADERS.CONTENT_TYPE]: CONTENT_TYPES.PLAIN_TEXT },
      })
    }
    // not the caller's fault, so let it surface as a 500 rather than a 400
    throw error
  }
}

// a Worker's entry point has to be the module's default export
export default {
  fetch: handle,
}
