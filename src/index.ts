import { BadRequestError, CONTENT_TYPES, HEADERS } from './http.ts'
import { parseItems, parseStyle } from './query-params.ts'
import { renderBadge } from './render.ts'
import { usagePage } from './usage.ts'

/**
 * How long a rendered badge may be cached: a week.
 *
 * Every value lives in the URL, so a change is a new URL and a cached
 * response can never go stale.
 */
const CACHE_SECONDS = 604_800

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

const handle = (request: Request) => {
  try {
    const url = new URL(request.url)
    const style = parseStyle(url.searchParams)

    if (url.pathname === '/') {
      // a bare root is someone opening the worker in a browser, so it gets the
      // landing page. Any query at all means a badge was intended, and a bad
      // one earns the 400 rather than a page that looks like success.
      if ([...url.searchParams].length === 0) {
        return htmlResponse(usagePage(url.origin), PAGE_CACHE_SECONDS)
      }
      const items = parseItems(url.searchParams.get('items'))
      return svgResponse(renderBadge({ ...style, items }), CACHE_SECONDS)
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
