import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { CONTENT_TYPES, HEADERS } from '../http.ts'
import worker from '../index.ts'

describe('fetch', () => {
  const get = (path: string) =>
    worker.fetch(new Request(`https://badge.example.dev${path}`))

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
