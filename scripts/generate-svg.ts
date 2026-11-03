/**
 * Regenerates sample.svg and the fixture SVGs under src/__fixtures__.
 *
 * The fixtures are what `render.test.ts` compares against, so running this is
 * how an intended change to the output gets recorded: regenerate, then read
 * the diff to see exactly what moved.
 */

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  SAMPLE_INPUT,
  TEST_FIXTURE_INPUTS,
} from '../src/__fixtures__/inputs.ts'
import { renderBadge } from '../src/render.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const write = (path: string, svg: string) => {
  writeFileSync(join(root, path), `${svg}\n`)
  console.log(`${path}: ${svg.length} bytes`)
}

write('sample.svg', renderBadge(SAMPLE_INPUT))
for (const [name, options] of Object.entries(TEST_FIXTURE_INPUTS)) {
  write(`src/__fixtures__/${name}.svg`, renderBadge(options))
}
