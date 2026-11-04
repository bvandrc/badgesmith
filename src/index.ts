import { BadRequestError, CONTENT_TYPES, HEADERS } from './http.ts'
import { parseItems, parseStyle } from './query-params.ts'
import { renderBadge } from './render.ts'

/**
 * How long a rendered badge may be cached: a week.
 *
 * Every value lives in the URL, so a change is a new URL and a cached
 * response can never go stale.
 */
const CACHE_SECONDS = 604_800

const svgResponse = (body: string, cacheSeconds: number) =>
  new Response(body, {
    headers: {
      [HEADERS.CONTENT_TYPE]: CONTENT_TYPES.SVG,
      [HEADERS.CACHE_CONTROL]: `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
    },
  })

const handle = (request: Request) => {
  try {
    const url = new URL(request.url)
    const style = parseStyle(url.searchParams)

    if (url.pathname === '/') {
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
