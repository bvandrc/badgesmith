import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { BadRequestError } from './http.ts'
import { parseItems, parseStyle } from './params.ts'

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

  test('items is required', () => {
    rejects(() => parseItems(null), 'items is required')
    rejects(() => parseItems(''), 'items is required')
  })

  test('rejects more items than it will render', () => {
    const seven = Array.from({ length: 7 }, () => 'star:1').join(',')
    rejects(() => parseItems(seven), 'at most 6 items')
    // six is the limit, not past it
    assert.equal(parseItems(seven.split(',').slice(0, 6).join(',')).length, 6)
  })

  test('rejects a malformed item, including a stray second colon', () => {
    for (const raw of ['star', 'star:', ':12', 'star:1:2']) {
      rejects(
        () => parseItems(raw),
        `malformed item "${raw}" — expected icon:value`
      )
    }
  })

  test('rejects an unknown icon', () => {
    rejects(() => parseItems('nope:1'), 'unknown icon "nope"')
  })

  test('rejects an over-long value', () => {
    rejects(
      () => parseItems('star:1234567890123'),
      'value for "star" must be at most 12 characters'
    )
    // twelve is the limit, not past it
    assert.deepEqual(parseItems('star:123456789012'), [
      { icon: 'star', value: '123456789012' },
    ])
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

  test('drops a stray leading # from a color', () => {
    assert.deepEqual(style('color=%23fff'), { color: 'fff' })
    assert.deepEqual(style('iconColor=%232f363d'), { iconColor: '2f363d' })
  })

  test('rejects a color that is not 3- or 6-digit hex', () => {
    for (const key of ['color', 'iconColor', 'textColor']) {
      rejects(
        () => style(`${key}=xyz`),
        `${key} must be a 3- or 6-digit hex color without '#'`
      )
    }
    // only one leading # is dropped, and only at the front
    rejects(
      () => style('color=%23%23fff'),
      "color must be a 3- or 6-digit hex color without '#'"
    )
    rejects(
      () => style('color=fff%23'),
      "color must be a 3- or 6-digit hex color without '#'"
    )
  })

  test('rejects a number outside its range, NaN included', () => {
    const height = 'height must be a number between 12 and 64'
    for (const raw of ['11', '65', 'abc', '']) {
      rejects(() => style(`height=${raw}`), height)
    }
    // the bounds themselves are allowed
    assert.deepEqual(style('height=12'), { height: 12 })
    assert.deepEqual(style('height=64'), { height: 64 })
    rejects(
      () => style('radius=33'),
      'radius must be a number between 0 and 32'
    )
    assert.deepEqual(style('radius=0'), { radius: 0 })
  })
})
