import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { BadRequestError } from '../../http.ts'
import { GITHUB_PROVIDER } from '../github.ts'

describe('GITHUB_PROVIDER', () => {
  const resolve = (query: string) =>
    GITHUB_PROVIDER.resolve(new URLSearchParams(query), {})

  test('renders a commit and a pull request count', () => {
    assert.deepEqual(GITHUB_PROVIDER.icons, ['git-commit', 'git-pull-request'])
  })

  test('rejects a repo that is not owner/name, before reaching the API', async () => {
    for (const query of [
      '',
      'repo=',
      'repo=bvandrc',
      'repo=a/b/c',
      'repo=a b/c',
    ]) {
      // substring, so rewording the example in the message does not break this
      await assert.rejects(
        () => resolve(query),
        (error: unknown) =>
          error instanceof BadRequestError &&
          error.message.includes('repo is required'),
        `should reject "${query}"`
      )
    }
  })
})
