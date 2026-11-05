import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { BADGE_FONTS, textWidth } from '../text.ts'

describe('textWidth', () => {
  test('measures an emoji once, whatever it is built from', () => {
    const size = 20
    const plain = textWidth('🧪', size)
    // a variation selector, a joined sequence of three, and a flag built from
    // a pair of regional indicators are each one mark the reader sees
    assert.equal(textWidth('🖥️', size), plain)
    assert.equal(textWidth('👨‍💻', size), plain)
    assert.equal(textWidth('🇺🇸', size), plain)
  })

  test('measures an emoji against its own advance, not the table', () => {
    const size = 20
    // emoji come from the reader's own font and advance further than anything
    // these tables hold, so the fallback would leave a badge too narrow
    for (const font of BADGE_FONTS) {
      const emoji = textWidth('🧪', size, { font })
      const widest = Math.max(
        ...[...' !@#$%&WMm0'].map((c) => textWidth(c, size, { font }))
      )
      assert.ok(
        emoji > widest,
        `${font}: expected an emoji (${emoji}) to pass the widest glyph in the table (${widest})`
      )
      // the same advance whichever face is asked for, since none of them
      // carries emoji and they all fall through to the reader's own
      assert.equal(emoji, textWidth('🧪', size, { font: 'verdana' }))
    }
  })

  test('measures a non-breaking space as a space', () => {
    const size = 20
    for (const font of BADGE_FONTS) {
      assert.equal(
        textWidth('\u00a0', size, { font }),
        textWidth(' ', size, { font }),
        `${font}: a non-breaking space should advance as a space does`
      )
    }
    // which is the point of it: a run of them survives being drawn, and is
    // measured at what it will actually take
    assert.equal(textWidth('\u00a0'.repeat(5), 20), textWidth('     ', 20))
  })

  test('still measures ASCII from the table', () => {
    // the glyphs are not all one width, which a fallback for everything
    // would have made them
    assert.ok(textWidth('W', 20) > textWidth('i', 20))
  })
})
