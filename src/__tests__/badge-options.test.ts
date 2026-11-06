import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  InvalidBadgeError,
  validateBadgeOptions,
  validateItems,
  validateStyle,
} from '../badge-options.ts'
import type { BadgeItem } from '../render.ts'

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
      error instanceof InvalidBadgeError && error.message.includes(text),
    `expected an InvalidBadgeError containing: ${text}`
  )

describe('validateItems', () => {
  test('passes items it can draw through unchanged', () => {
    const ITEMS = [
      { icon: 'git-commit', value: '370' },
      { value: 'stable' },
      { icon: 'star' },
    ] satisfies BadgeItem[]
    assert.deepEqual(validateItems(ITEMS), ITEMS)
  })

  test('rejects no items, and more than it will render', () => {
    rejects(() => validateItems([]), 'a badge needs at least one item')
    const SEVEN = Array.from({ length: 7 }, () => ({
      icon: 'star',
      value: '1',
    })) satisfies BadgeItem[]
    rejects(() => validateItems(SEVEN), 'at most 6 items')
    // six is the limit, not past it
    assert.equal(validateItems(SEVEN.slice(0, 6)).length, 6)
  })

  test('rejects an unknown icon', () => {
    rejects(
      () => validateItems([{ icon: 'nope', value: '1' }]),
      'unknown icon "nope"'
    )
    // an icon alone still has to be one
    rejects(() => validateItems([{ icon: 'nope' }]), 'unknown icon "nope"')
  })

  test('rejects an item with nothing to draw', () => {
    rejects(
      // @ts-expect-error the types require an icon or a value; plain JS can omit both
      () => validateItems([{}]),
      'an item needs an icon, a value, or both'
    )
    rejects(
      () => validateItems([{ value: '' }]),
      'an item needs an icon, a value, or both'
    )
    // beside an icon, an empty value would draw a gap: leaving it out is how
    // an icon stands alone
    rejects(
      () => validateItems([{ icon: 'star', value: '' }]),
      'value for "star" must not be empty'
    )
  })

  test('rejects an over-long value', () => {
    const AT_LIMIT = '1'.repeat(64)
    rejects(
      () => validateItems([{ icon: 'star', value: `${AT_LIMIT}3` }]),
      'value for "star" must be at most 64 characters'
    )
    // sixty-four is the limit, not past it
    assert.equal(validateItems([{ icon: 'star', value: AT_LIMIT }]).length, 1)
    // an item with no icon is named by its own value when it is too long
    rejects(
      () => validateItems([{ value: `${AT_LIMIT}3` }]),
      `value for "${AT_LIMIT}3" must be at most 64 characters`
    )
  })

  test('counts a value in code units, which emoji spend several of', () => {
    // 🖥️ is a surrogate pair plus a variation selector: three each, so
    // twenty-one of them reach the limit and twenty-two pass it
    const MONITOR = '🖥️'
    assert.equal(MONITOR.length, 3)
    assert.equal(validateItems([{ value: MONITOR.repeat(21) }]).length, 1)
    rejects(
      () => validateItems([{ value: MONITOR.repeat(22) }]),
      'must be at most 64 characters'
    )
  })
})

describe('validateStyle', () => {
  test('passes a valid style through, stripping unknown keys', () => {
    assert.deepEqual(validateStyle({}), {})
    assert.deepEqual(
      validateStyle({ color: 'fff', height: 40, radius: 6, bold: true }),
      { color: 'fff', height: 40, radius: 6, bold: true }
    )
    assert.deepEqual(validateStyle({ color: 'fff', repo: 'a/b' }), {
      color: 'fff',
    })
  })

  test('drops a stray leading # from a color', () => {
    assert.deepEqual(validateStyle({ color: '#fff' }), { color: 'fff' })
    assert.deepEqual(validateStyle({ iconColor: '#2f363d' }), {
      iconColor: '2f363d',
    })
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
      rejects(() => validateStyle({ [key]: 'xyz' }), `${key} ${message}`)
      // a color is written into an attribute, so one that could close it is
      // refused rather than drawn
      rejects(
        () => validateStyle({ [key]: '"/><script>alert(1)</script>' }),
        `${key} ${message}`
      )
    }
    // only one leading # is dropped, and only at the front
    rejects(() => validateStyle({ color: '##fff' }), `color ${MESSAGES.color}`)
    rejects(() => validateStyle({ color: 'fff#' }), `color ${MESSAGES.color}`)
  })

  test("takes 'none' as a background, and only as a background", () => {
    assert.deepEqual(validateStyle({ color: 'none' }), { color: 'none' })
    // matched exactly, because the renderer compares the value against
    // TRANSPARENT rather than normalising it first
    rejects(
      () => validateStyle({ color: 'NONE' }),
      "color must be a 3- or 6-digit hex color without '#', or 'none'"
    )
    // icons and text are drawn with a fill, which has no element to omit
    rejects(
      () => validateStyle({ iconColor: 'none' }),
      "iconColor must be a 3- or 6-digit hex color without '#'"
    )
  })

  test('leaves the case of hex alone', () => {
    // case-folding here would move bytes the committed fixtures pin
    assert.deepEqual(validateStyle({ color: 'ABCdef' }), { color: 'ABCdef' })
  })

  test('rejects a number outside its range, NaN included', () => {
    const height = 'height must be a number between 12 and 64'
    for (const value of [11, 65, Number.NaN]) {
      rejects(() => validateStyle({ height: value }), height)
    }
    rejects(() => validateStyle({ height: '20' }), height)
    // the bounds themselves are allowed
    assert.deepEqual(validateStyle({ height: 12 }), { height: 12 })
    assert.deepEqual(validateStyle({ height: 64 }), { height: 64 })
    rejects(
      () => validateStyle({ radius: 33 }),
      'radius must be a number between 0 and 32'
    )
    // above 1 an icon would be cut off by the badge's own edges
    rejects(
      () => validateStyle({ iconScale: 1.5 }),
      'iconScale must be a number between 0.25 and 1'
    )
  })

  test('rejects padding that leaves the contents no room', () => {
    // each field is checked alone first, so this is the one rule that needs
    // both: half the box on each side would scale the contents to nothing
    rejects(
      () => validateStyle({ padY: 10, height: 20 }),
      'padY must be under half of height (10)'
    )
    // the same rule against the default height
    rejects(
      () => validateStyle({ padY: 10 }),
      'padY must be under half of height (10)'
    )
    // just inside is allowed, and so is none at all
    assert.deepEqual(validateStyle({ padY: 9, height: 20 }), {
      padY: 9,
      height: 20,
    })
    assert.deepEqual(validateStyle({ padY: 0 }), { padY: 0 })
  })

  test('rejects an iconSide or a font it does not have', () => {
    rejects(
      () => validateStyle({ iconSide: 'top' }),
      'iconSide must be left or right'
    )
    // a face the tables do not cover would be measured against the wrong
    // metrics, leaving the text wider or narrower than the pill drawn for it
    for (const font of ['helvetica', 'Arial', '']) {
      rejects(
        () => validateStyle({ font }),
        'font must be one of verdana, arial, times, courier'
      )
    }
  })

  test('rejects a flag that is not a boolean', () => {
    rejects(() => validateStyle({ bold: 'true' }), 'bold must be true or false')
  })

  test('refuses text its box would cut off', () => {
    assert.deepEqual(
      validateStyle({ height: 30, padY: 0, font: 'arial', fontSize: 24 }),
      { height: 30, padY: 0, font: 'arial', fontSize: 24 }
    )
    // what fits depends on the face as well as the box, so the message names
    // both rather than quoting one number for all of them
    rejects(
      () => validateStyle({ height: 20, padY: 0, font: 'arial', fontSize: 18 }),
      'fontSize must be at most 16.77 for arial in this box — raise height, or lower padY'
    )
    rejects(
      () => validateStyle({ height: 20, padY: 0, fontSize: 18 }),
      'fontSize must be at most 15.84 for verdana in this box — raise height, or lower padY'
    )
  })
})

describe('validateBadgeOptions', () => {
  test('checks the items and the style together', () => {
    assert.deepEqual(
      validateBadgeOptions({ items: [{ icon: 'star' }], color: '#fff' }),
      { items: [{ icon: 'star' }], color: 'fff' }
    )
    rejects(() => validateBadgeOptions({ items: [] }), 'at least one item')
    rejects(
      () => validateBadgeOptions({ items: [{ icon: 'star' }], height: 99 }),
      'height must be a number between 12 and 64'
    )
  })
})
