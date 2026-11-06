import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { SAMPLE_INPUT } from '../__fixtures__/inputs.ts'
import { InvalidBadgeError, renderBadge } from '../library.ts'
import { renderBadge as drawBadge } from '../render.ts'

describe('renderBadge', () => {
  test('draws exactly what the renderer draws for valid options', () => {
    assert.equal(renderBadge(SAMPLE_INPUT), drawBadge(SAMPLE_INPUT))
  })

  test('validates the options before drawing them', () => {
    // which limits apply is validateBadgeOptions' business, tested there; this
    // only pins that the package's entry runs them
    assert.throws(
      () => renderBadge({ ...SAMPLE_INPUT, color: '"/><script>' }),
      InvalidBadgeError
    )
    // and draws what they normalise, not what it was handed
    assert.equal(
      renderBadge({ ...SAMPLE_INPUT, color: '#2f363d' }),
      drawBadge({ ...SAMPLE_INPUT, color: '2f363d' })
    )
  })
})
