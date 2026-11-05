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

  test('reads an icon on its own, written with a trailing colon', () => {
    assert.deepEqual(parseItems('star:'), [{ icon: 'star', value: undefined }])
    // beside the other two forms, which still mean what they did
    assert.deepEqual(parseItems('star:1,repo,eye:2'), [
      { icon: 'star', value: '1' },
      { value: 'repo' },
      { icon: 'eye', value: '2' },
    ])
    // the icon still has to be one
    rejects(() => parseItems('nope:'), 'unknown icon "nope"')
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

  test('rejects an unknown icon', () => {
    rejects(() => parseItems('nope:1'), 'unknown icon "nope"')
  })

  test('rejects an over-long value', () => {
    const atLimit = '1'.repeat(64)
    rejects(
      () => parseItems(`star:${atLimit}3`),
      'value for "star" must be at most 64 characters'
    )
    // sixty-four is the limit, not past it
    assert.deepEqual(parseItems(`star:${atLimit}`), [
      { icon: 'star', value: atLimit },
    ])
    // an item with no icon is named by its own value when it is too long
    rejects(
      () => parseItems(`${atLimit}3`),
      `value for "${atLimit}3" must be at most 64 characters`
    )
  })

  test('counts a value in code units, which emoji spend several of', () => {
    // 🖥️ is a surrogate pair plus a variation selector: three each, so
    // twenty-one of them reach the limit and twenty-two pass it
    const monitor = '🖥️'
    assert.equal(monitor.length, 3)
    assert.deepEqual(parseItems(monitor.repeat(21)), [
      { value: monitor.repeat(21) },
    ])
    rejects(
      () => parseItems(monitor.repeat(22)),
      `value for "${monitor.repeat(22)}" must be at most 64 characters`
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

  test('reads font, and rejects a face it has no metrics for', () => {
    assert.deepEqual(style('font=arial'), { font: 'arial' })
    assert.deepEqual(style('font=verdana'), { font: 'verdana' })
    const message = 'font must be one of verdana, arial, times, courier'
    // a face the tables do not cover would be measured against the wrong
    // metrics, leaving the text wider or narrower than the pill drawn for it
    rejects(() => style('font=helvetica'), message)
    rejects(() => style('font=Arial'), message)
    rejects(() => style('font='), message)
  })

  test('reads fontSize, and refuses text its box would cut off', () => {
    assert.deepEqual(style('height=30&padY=0&font=arial&fontSize=24'), {
      height: 30,
      padY: 0,
      font: 'arial',
      fontSize: 24,
    })
    // what fits depends on the face as well as the box, so the message names
    // both rather than quoting one number for all of them
    rejects(
      () => style('height=20&padY=0&font=arial&fontSize=18'),
      'fontSize must be at most 16.77 for arial in this box — raise height, or lower padY'
    )
    rejects(
      () => style('height=20&padY=0&fontSize=18'),
      'fontSize must be at most 15.84 for verdana in this box — raise height, or lower padY'
    )
  })

  test('reads iconScale, and will not let it pass 1', () => {
    assert.deepEqual(style('iconScale=0.7'), { iconScale: 0.7 })
    assert.deepEqual(style('iconScale=1'), { iconScale: 1 })
    const message = 'iconScale must be a number between 0.25 and 1'
    // above 1 the icon would be cut off by the badge's own edges
    rejects(() => style('iconScale=1.5'), message)
    rejects(() => style('iconScale=0.1'), message)
  })

  test('reads bold, which the query carries as a word', () => {
    assert.deepEqual(style('bold=true'), { bold: true })
    assert.deepEqual(style('bold=false'), { bold: false })
    rejects(() => style('bold=yes'), 'bold must be true or false')
  })

  test('reads underline, which the query carries as a word', () => {
    assert.deepEqual(style('underline=true'), { underline: true })
    assert.deepEqual(style('underline=false'), { underline: false })
    // there are no bare flags here, so a present-but-empty one is not true
    rejects(() => style('underline'), 'underline must be true or false')
    rejects(() => style('underline=1'), 'underline must be true or false')
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
