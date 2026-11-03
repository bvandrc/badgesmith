/**
 * Hits a deployed worker and checks its responses against the fixtures.
 *
 * The fixtures are what `render.test.ts` already pins, so this asserts the
 * deployed route reaches the same bytes through URL parsing, headers and the
 * network — the parts a unit test cannot reach.
 *
 * Needs BASE_URL, e.g. `BASE_URL=http://localhost:8787 pnpm e2e` against
 * `pnpm dev`, or the deployed origin.
 */

import { readFileSync } from 'node:fs'

import {
  SAMPLE_INPUT,
  TEST_FIXTURE_INPUTS,
} from '../src/__fixtures__/inputs.ts'
import { CONTENT_TYPES, HEADERS } from '../src/http.ts'
import type { BadgeOptions } from '../src/render.ts'

const base = process.env.BASE_URL?.replace(/\/+$/, '')
if (!base) {
  console.error(
    'BASE_URL is required — the deployed worker origin, e.g. https://multi-icon-badge.<subdomain>.workers.dev'
  )
  process.exit(1)
}

/** The query string that asks the route for what `options` renders directly. */
const queryFor = ({ items, ...style }: BadgeOptions) => {
  const params = new URLSearchParams({
    items: items.map(({ icon, value }) => `${icon}:${value}`).join(','),
  })
  for (const [key, value] of Object.entries(style)) {
    params.set(key, String(value))
  }
  return params
}

const expected = (file: string) =>
  readFileSync(new URL(file, import.meta.url), 'utf8').trimEnd()

/** Everything with a committed SVG to be held to, fixtures and the sample. */
const pinned: { name: string; options: BadgeOptions; file: string }[] = [
  ...Object.entries(TEST_FIXTURE_INPUTS).map(([name, options]) => ({
    name,
    options,
    file: `../src/__fixtures__/${name}.svg`,
  })),
  { name: 'sample', options: SAMPLE_INPUT, file: '../sample.svg' },
]

let failed = 0
let n = 0
const check = (name: string, ok: boolean, detail = '') => {
  n++
  console.log(
    `${ok ? 'ok' : 'not ok'} ${n} - ${name}${ok ? '' : ` — ${detail}`}`
  )
  if (!ok) {
    failed++
  }
}

for (const { name, options, file } of pinned) {
  const url = `${base}/?${queryFor(options)}`
  const res = await fetch(url)
  const body = await res.text()
  check(`${name}: 200`, res.status === 200, `got ${res.status}`)
  // camo sends nosniff, so a wrong type here renders nothing at all
  check(
    `${name}: exact content type`,
    res.headers.get(HEADERS.CONTENT_TYPE) === CONTENT_TYPES.SVG,
    `got ${res.headers.get(HEADERS.CONTENT_TYPE)}`
  )
  check(
    `${name}: cached`,
    (res.headers.get(HEADERS.CACHE_CONTROL) ?? '').includes('max-age='),
    `got ${res.headers.get(HEADERS.CACHE_CONTROL)}`
  )
  check(
    `${name}: matches its committed SVG`,
    body.trimEnd() === expected(file),
    `deployed output differs from ${file.replace('../', '')} — redeploy, or regenerate if intended`
  )
}

// the error paths matter as much: a 200 carrying an error would render as a
// broken image rather than showing the reason
for (const [label, path, status] of [
  ['missing items', '/', 400],
  ['unknown icon', '/?items=definitely-not-an-icon:1', 400],
  ['bad colour', '/?items=star:1&color=xyz', 400],
  ['unknown route', '/nope', 404],
] as const) {
  const res = await fetch(`${base}${path}`)
  const body = await res.text()
  check(`${label}: ${status}`, res.status === status, `got ${res.status}`)
  check(
    `${label}: plain text`,
    res.headers.get(HEADERS.CONTENT_TYPE) === CONTENT_TYPES.PLAIN_TEXT,
    `got ${res.headers.get(HEADERS.CONTENT_TYPE)}`
  )
  check(`${label}: explains itself`, body.trim().length > 0, 'empty body')
}

console.log(`\n# checks ${n}\n# pass ${n - failed}\n# fail ${failed}`)
if (failed > 0) {
  process.exit(1)
}
