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

  test('rejects more items than it will render', () => {
    const seven = Array.from({ length: 7 }, () => 'star:1').join(',')
    rejects(() => parseItems(seven), 'at most 6 items')
    // six is the limit, not past it
    assert.equal(parseItems(seven.split(',').slice(0, 6).join(',')).length, 6)
  })

  test('rejects a malformed item, including a stray second colon', () => {
    for (const raw of ['star:', ':12', 'star:1:2']) {
      rejects(
        () => parseItems(raw),
        `malformed item "${raw}" — expected icon:value, or value alone`
      )
    }
  })

  test('rejects an unknown icon', () => {
    rejects(() => parseItems('nope:1'), 'unknown icon "nope"')
  })

  test('rejects an over-long value', () => {
    const thirtyTwo = '1'.repeat(32)
    rejects(
      () => parseItems(`star:${thirtyTwo}3`),
      'value for "star" must be at most 32 characters'
    )
    // thirty-two is the limit, not past it
    assert.deepEqual(parseItems(`star:${thirtyTwo}`), [
      { icon: 'star', value: thirtyTwo },
    ])
    // an item with no icon is named by its own value when it is too long
    rejects(
      () => parseItems(`${thirtyTwo}3`),
      `value for "${thirtyTwo}3" must be at most 32 characters`
    )
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
    const hex = "must be a 3- or 6-digit hex color without '#'"
    // only the background can be dropped, so only its message offers the keyword
    const MESSAGES = {
      color: `${hex}, or 'none'`,
      iconColor: hex,
      textColor: hex,
    }
    for (const [key, message] of Object.entries(MESSAGES)) {
      rejects(() => style(`${key}=xyz`), `${key} ${message}`)
    }
    // only one leading # is dropped, and only at the front
    rejects(() => style('color=%23%23fff'), `color ${MESSAGES.color}`)
    rejects(() => style('color=fff%23'), `color ${MESSAGES.color}`)
  })

  test("takes 'none' as a background, and only as a background", () => {
    assert.deepEqual(style('color=none'), { color: 'none' })
    // matched exactly, because the renderer compares the parsed value against
    // TRANSPARENT rather than normalising it first
    rejects(
      () => style('color=NONE'),
      "color must be a 3- or 6-digit hex color without '#', or 'none'"
    )
    // icons and text are drawn with a fill, which has no element to omit
    rejects(
      () => style('iconColor=none'),
      "iconColor must be a 3- or 6-digit hex color without '#'"
    )
  })

  test('reads hex in either case, and leaves the case alone', () => {
    // case-folding here would move bytes the committed fixtures pin
    assert.deepEqual(style('color=ABCdef'), { color: 'ABCdef' })
  })

  test('reads padY, including zero', () => {
    assert.deepEqual(style('padY=0'), { padY: 0 })
    assert.deepEqual(style('padY=2&height=20'), { padY: 2, height: 20 })
  })

  test('rejects padding that leaves the contents no room', () => {
    // the schema checks each field alone, so this is the one rule that needs
    // both: half the box on each side would scale the contents to nothing
    rejects(
      () => style('padY=10&height=20'),
      'padY must be under half of height (10)'
    )
    // the same rule against the default height, which the schema cannot see either
    rejects(() => style('padY=10'), 'padY must be under half of height (10)')
    // just inside is allowed
    assert.deepEqual(style('padY=9&height=20'), { padY: 9, height: 20 })
    assert.deepEqual(style('padY=5&height=12'), { padY: 5, height: 12 })
  })

  test('reads iconSide, and rejects a side that is not one', () => {
    assert.deepEqual(style('iconSide=right'), { iconSide: 'right' })
    assert.deepEqual(style('iconSide=left'), { iconSide: 'left' })
    rejects(() => style('iconSide=top'), 'iconSide must be left or right')
    rejects(() => style('iconSide='), 'iconSide must be left or right')
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
