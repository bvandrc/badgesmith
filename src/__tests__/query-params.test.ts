import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { BadRequestError } from '../http.ts'
import { parseItems, parseStyle } from '../query-params.ts'

/**
 * Asserts `fn` rejects the input, for the reason `text` names.
 *
 * Matched as a substring, so these do not break when an example or a link in
 * a message is reworded — only when the reason itself changes.
 */
const rejects = (fn: () => unknown, text: string) =>
  assert.throws(
    fn,
    (error: unknown) =>
      error instanceof BadRequestError && error.message.includes(text),
    `expected a BadRequestError containing: ${text}`
  )

describe('parseItems', () => {
  test('reads items', () => {
    assert.deepEqual(parseItems('star:12'), [{ icon: 'star', value: '12' }])
    assert.deepEqual(parseItems('git-commit:370,git-pull-request:264'), [
      { icon: 'git-commit', value: '370' },
      { icon: 'git-pull-request', value: '264' },
    ])
    // a value is free to contain anything but a colon
    assert.deepEqual(parseItems('tag:1.2M'), [{ icon: 'tag', value: '1.2M' }])
  })

  test('reads a value on its own, which draws without an icon', () => {
    assert.deepEqual(parseItems('repo'), [{ value: 'repo' }])
    // mixed with a pair, and not mistaken for an icon of the same name
    assert.deepEqual(parseItems('git-commit:370,star'), [
      { icon: 'git-commit', value: '370' },
      { value: 'star' },
    ])
  })

  test('items is required', () => {
    rejects(() => parseItems(null), 'items is required')
    rejects(() => parseItems(''), 'items is required')
  })

  test('reads an icon on its own, written with a trailing colon', () => {
    assert.deepEqual(parseItems('star:'), [{ icon: 'star', value: undefined }])
    // beside the other two forms, which still mean what they did
    assert.deepEqual(parseItems('star:1,repo,eye:2'), [
      { icon: 'star', value: '1' },
      { value: 'repo' },
      { icon: 'eye', value: '2' },
    ])
  })

  test('rejects a malformed item, including a stray second colon', () => {
    // a trailing colon is an icon on its own, so what is left is a leading
    // one, which names no icon, and a second colon, which names nothing
    for (const raw of [':12', ':', 'star:1:2']) {
      rejects(
        () => parseItems(raw),
        `malformed item "${raw}" — expected icon:value, icon: alone, or value alone`
      )
    }
  })

  test("reports what validateItems refuses as the caller's to fix", () => {
    // the limits themselves belong to validateItems, and are tested there
    rejects(() => parseItems('nope:1'), 'unknown icon "nope"')
  })
})

describe('parseStyle', () => {
  const style = (query: string) => parseStyle(new URLSearchParams(query))

  test('reads the style params, stripping anything else', () => {
    assert.deepEqual(style(''), {})
    assert.deepEqual(style('color=fff&height=40&radius=6'), {
      color: 'fff',
      height: 40,
      radius: 6,
    })
    // a route's own params are not the style schema's business
    assert.deepEqual(style('items=star:1&repo=a/b&color=fff'), { color: 'fff' })
  })

  test("reports what validateStyle refuses as the caller's to fix", () => {
    // the limits themselves belong to validateStyle, and are tested there
    rejects(() => style('padY=10'), 'padY must be under half of height (10)')
  })

  test('reads a flag, which the query carries as a word', () => {
    assert.deepEqual(style('bold=true&underline=false'), {
      bold: true,
      underline: false,
    })
    // there are no bare flags here, so a present-but-empty one is not true
    for (const raw of ['underline', 'underline=1', 'underline=yes']) {
      rejects(() => style(raw), 'underline must be true or false')
    }
  })

  test('reads a number from its text, and refuses text that is not one', () => {
    assert.deepEqual(style('height=12&iconScale=0.7'), {
      height: 12,
      iconScale: 0.7,
    })
    // NaN, and the 0 an empty param reads as, both fall outside the range
    for (const raw of ['abc', '']) {
      rejects(
        () => style(`height=${raw}`),
        'height must be a number between 12 and 64'
      )
    }
  })
})
