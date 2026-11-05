/**
 * Hits a deployed worker and checks its responses against the fixtures.
 *
 * The fixtures are what `render.test.ts` already pins, so this asserts the
 * deployed route reaches the same bytes through URL parsing, headers and the
 * network — the parts a unit test cannot reach.
 *
 * Hits the deployment below unless BASE_URL names another origin, so
 * `BASE_URL=http://localhost:8787 pnpm e2e` checks `pnpm dev` instead.
 */

import { readFileSync } from 'node:fs'

import {
  SAMPLE_INPUT,
  TEST_FIXTURE_INPUTS,
} from '../src/__fixtures__/inputs.ts'
import { CONTENT_TYPES, HEADERS } from '../src/http.ts'
import type { BadgeOptions } from '../src/render.ts'

/**
 * The deployment this checks by default.
 *
 * Committed rather than configured: it is a public URL, embedded as an image
 * source wherever a badge is used, so hiding it in a repository variable buys
 * nothing and costs a setup step no clone or fork can see it needs.
 */
const DEPLOYED_ORIGIN = 'https://badgesmith.bvandrc.workers.dev'

const base = (process.env.BASE_URL || DEPLOYED_ORIGIN).replace(/\/+$/, '')
console.log(`# ${base}\n`)

/** The query string that asks the route for what `options` renders directly. */
const queryFor = ({ items, ...style }: BadgeOptions) => {
  const params = new URLSearchParams({
    items: items
      // an item with no icon goes over as its value alone, the way the
      // parser reads it back
      .map(({ icon, value }) =>
        icon === undefined ? value : `${icon}:${value}`
      )
      .join(','),
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

// a bare root is the usage page, not an error — the distinction the route
// turns on, and the reason 'missing items' above carries a query
{
  const res = await fetch(`${base}/`)
  const body = await res.text()
  check('usage page: 200', res.status === 200, `got ${res.status}`)
  check(
    'usage page: html',
    res.headers.get(HEADERS.CONTENT_TYPE) === CONTENT_TYPES.HTML,
    `got ${res.headers.get(HEADERS.CONTENT_TYPE)}`
  )
  check(
    'usage page: renders as a document',
    body.startsWith('<!doctype html>'),
    `starts with ${JSON.stringify(body.slice(0, 20))}`
  )
}

// A provider's bytes cannot be pinned: the counts change, and GitHub's
// unauthenticated limit is per address — a CI runner shares one — so asserting
// the values, or that the lookup succeeded at all, would flake. The rendered
// `aria-label` is where the output names what it drew, so it carries the parts
// that do not change: which icons, in which order, each holding a count or the
// placeholder a failed lookup leaves behind.
{
  const res = await fetch(`${base}/github?repo=bvandrc/badgesmith`)
  const body = await res.text()
  // `${value} ${slug}` per item, joined with ', ' — see renderBadge
  const pairs = (body.match(/aria-label="([^"]*)"/)?.[1] ?? '')
    .split(', ')
    .map((pair) => pair.split(' '))
  const maxAge = Number(
    res.headers.get(HEADERS.CACHE_CONTROL)?.match(/max-age=(\d+)/)?.[1]
  )

  check('github: 200', res.status === 200, `got ${res.status}`)
  check(
    'github: exact content type',
    res.headers.get(HEADERS.CONTENT_TYPE) === CONTENT_TYPES.SVG,
    `got ${res.headers.get(HEADERS.CONTENT_TYPE)}`
  )
  // hard-coded rather than read off the provider: this is the contract the
  // route promises, so a change to its icons should fail here and be noticed
  check(
    'github: renders its own icons, in order',
    pairs.map(([, icon]) => icon).join() === 'git-commit,git-pull-request',
    `got ${JSON.stringify(pairs.map(([, icon]) => icon))}`
  )
  check(
    'github: every value is a count or the placeholder',
    pairs.length === 2 &&
      pairs.every(([value]) => /^(?:\d+|\?)$/.test(value ?? '')),
    `got ${JSON.stringify(pairs.map(([value]) => value))}`
  )
  // a badge whose values came in the URL caches for a week, so this also says
  // the request went through the provider rather than the explicit-value route
  check(
    'github: cached as a lookup, not as a static badge',
    maxAge === 3600 || maxAge === 300,
    `max-age=${maxAge}`
  )
}

// the error paths matter as much: a 200 carrying an error would render as a
// broken image rather than showing the reason
for (const [label, path, status] of [
  ['missing items', '/?color=fff', 400],
  ['unknown icon', '/?items=definitely-not-an-icon:1', 400],
  ['bad color', '/?items=star:1&color=xyz', 400],
  ['github without a repo', '/github', 400],
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
