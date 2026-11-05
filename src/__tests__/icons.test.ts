import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { getIcon, hasIcon } from '../icons.ts'

describe('the icon registry', () => {
  test('carries octicons and the listed brand marks alike', () => {
    for (const slug of ['star', 'git-commit', 'file-directory']) {
      assert.ok(hasIcon(slug), `expected the octicon "${slug}"`)
    }
    for (const slug of ['react', 'typescript', 'python', 'cloudflareworkers']) {
      assert.ok(hasIcon(slug), `expected the brand mark "${slug}"`)
    }
    // and nothing beyond the list, so the registry stays the size it is
    assert.equal(hasIcon('mcdonalds'), false)
  })

  test('leaves a shared slug to the octicon', () => {
    // simple-icons has a Ruby mark on a 24x24 square and octicons a gem on a
    // 16x16 one. They share one namespace, and the octicon is the name callers
    // have always had, so it keeps it.
    const { width, height } = getIcon('ruby')
    assert.deepEqual(
      { width, height },
      { width: 16, height: 16 },
      'a brand mark took a slug an octicon already answered to'
    )
  })
})
