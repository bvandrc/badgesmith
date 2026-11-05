import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { CONTENT_TYPES, HEADERS } from '../http.ts'
import worker from '../index.ts'

describe('fetch', () => {
  // the route takes an env and a context: no case here reaches the token, and
  // waitUntil only has to accept the promise it is handed
  const get = (path: string) =>
    worker.fetch(
      new Request(`https://badge.example.dev${path}`),
      {},
      { waitUntil: () => undefined }
    )

  const typeOf = (response: Response) =>
    response.headers.get(HEADERS.CONTENT_TYPE)

  const maxAge = (response: Response) =>
    Number(
      response.headers.get(HEADERS.CACHE_CONTROL)?.match(/max-age=(\d+)/)?.[1]
    )

  test('serves the landing page on a bare root', async () => {
    const response = await get('/')
    assert.equal(response.status, 200)
    assert.equal(typeOf(response), CONTENT_TYPES.HTML)
    assert.match(await response.text(), /^<!doctype html>/)
  })

  // the page's own image sources, with the entity-escaped separators undone
  const getPageImages = async () => {
    const html = await (await get('/')).text()
    return [...html.matchAll(/<img src="([^"]+)"/g)].map(([, src]) =>
      src.replaceAll('&amp;', '&')
    )
  }

  test('renders every explicit-value badge the landing page shows', async () => {
    const srcs = await getPageImages()
    assert.ok(srcs.length >= 3, `expected several examples, got ${srcs.length}`)
    for (const src of srcs) {
      // root-relative, so the deployment serving the page renders its badges
      assert.match(src, /^\/[^/]/, src)
    }
    // a provider's badge would look its values up over the network
    for (const src of srcs.filter((path) => path.startsWith('/?'))) {
      const response = await get(src)
      assert.equal(response.status, 200, src)
      assert.equal(typeOf(response), CONTENT_TYPES.SVG, src)
    }
  })

  test('the landing page references nothing external but its own links', async () => {
    const html = await (await get('/')).text()
    assert.doesNotMatch(html, /<script|<link|@import/)
    const remote = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map(
      ([, url]) => url
    )
    assert.deepEqual(remote, [
      'https://primer.style/foundations/icons',
      'https://github.com/bvandrc/badgesmith',
    ])
  })

  test('serves a badge once the root is given a query', async () => {
    const response = await get('/?items=star:12')
    assert.equal(response.status, 200)
    assert.equal(typeOf(response), CONTENT_TYPES.SVG)
    assert.match(await response.text(), /^<svg /)
  })

  test('a query without items is a bad request, not the landing page', async () => {
    // the distinction the route turns on: a caller who passed something meant
    // to make a badge gets told what is wrong, rather than a page that looks
    // like the request succeeded
    const response = await get('/?color=fff')
    assert.equal(response.status, 400)
    assert.equal(typeOf(response), CONTENT_TYPES.PLAIN_TEXT)
    assert.match(await response.text(), /items is required/)
  })

  test('caches the page for less time than a badge', async () => {
    // a badge's values live in its URL, so it can be cached hard; the page's
    // URL is fixed while its content changes on deploy
    const page = maxAge(await get('/'))
    const badge = maxAge(await get('/?items=star:12'))
    assert.ok(page < badge, `page ${page} should be under badge ${badge}`)
    assert.equal(badge, 604_800)
  })

  test('anything else is a 404', async () => {
    const response = await get('/nope')
    assert.equal(response.status, 404)
    assert.equal(typeOf(response), CONTENT_TYPES.PLAIN_TEXT)
  })
})
