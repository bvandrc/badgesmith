import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { usagePage } from '../usage-page.ts'

describe('usagePage', () => {
  const ORIGIN = 'https://multi-icon-badge.example.workers.dev'

  test('points every example at the origin it was given', () => {
    const html = usagePage(ORIGIN)
    const srcs = [...html.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1])
    assert.ok(srcs.length >= 3, `expected several examples, got ${srcs.length}`)
    for (const src of srcs) {
      assert.ok(
        src.startsWith(`${ORIGIN}/?`),
        `${src} should be served by this deployment`
      )
    }
  })

  test('escapes the query separators rather than emitting raw &', () => {
    const html = usagePage(ORIGIN)
    // a raw & between params would end the entity parse and mangle the URL
    assert.match(html, /&#38;color=1f6feb/)
    assert.doesNotMatch(html, /\?items=[^"<]*&[a-z]/)
  })

  test('references nothing external but its own links', () => {
    const html = usagePage(ORIGIN)
    assert.doesNotMatch(html, /<script|<link|@import/)
    const remote = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)]
      .map((m) => m[1])
      .filter((url) => !url.startsWith(ORIGIN))
    assert.deepEqual(remote, [
      'https://primer.style/foundations/icons',
      'https://github.com/bvandrc/multi-icon-badge',
    ])
  })

  test('is a document a browser will render', () => {
    const html = usagePage(ORIGIN)
    assert.match(html, /^<!doctype html>/)
    assert.match(html, /<title>multi-icon-badge<\/title>/)
    assert.match(html, /<meta name="viewport"/)
  })
})
