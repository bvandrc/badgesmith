import assert from 'node:assert/strict'
import { test } from 'node:test'

import { renderBadge } from './render.ts'

const widthOf = (svg: string) =>
  Number(svg.match(/^<svg[^>]*width="([\d.]+)"/)?.[1])

test('renders one pill holding every icon and value', () => {
  const svg = renderBadge({
    items: [
      { icon: 'git-commit', value: '370' },
      { icon: 'git-pull-request', value: '264' },
    ],
  })
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
  assert.equal(svg.match(/<rect /g)?.length, 1, 'a single background pill')
  assert.equal(svg.match(/<g fill="#8B949E"/g)?.length, 2, 'both icons tinted')
  assert.match(svg, />370</)
  assert.match(svg, />264</)
  assert.match(svg, /aria-label="370 git-commit, 264 git-pull-request"/)
})

test('references nothing external, which the image proxy forbids', () => {
  const svg = renderBadge({ items: [{ icon: 'star', value: '12' }] })
  assert.doesNotMatch(svg, /<script|xlink:href|<image|@import|url\(/)
})

test('width grows with the number of characters', () => {
  const widths = ['7', '370', '12345'].map((value) =>
    widthOf(renderBadge({ items: [{ icon: 'git-commit', value }] }))
  )
  assert.ok(widths[0] < widths[1], `${widths[0]} < ${widths[1]}`)
  assert.ok(widths[1] < widths[2], `${widths[1]} < ${widths[2]}`)
  // every digit is one advance wide, so the growth is linear
  assert.ok(
    Math.abs((widths[2] - widths[1]) / 2 - (widths[1] - widths[0]) / 2) < 0.01
  )
})

test('scales with height', () => {
  const items = [{ icon: 'git-commit', value: '370' }]
  assert.ok(
    widthOf(renderBadge({ items, height: 40 })) >
      widthOf(renderBadge({ items, height: 20 }))
  )
  assert.match(renderBadge({ items, height: 18 }), /height="18"/)
})

test('escapes values rather than emitting raw markup', () => {
  const svg = renderBadge({ items: [{ icon: 'tag', value: '<b>&"' }] })
  assert.doesNotMatch(svg, /<b>/)
  assert.match(svg, /&#60;b&#62;&#38;&#34;/)
})

test('rejects an unknown icon', () => {
  assert.throws(
    () => renderBadge({ items: [{ icon: 'nope', value: '1' }] }),
    /unknown icon: nope/
  )
})
