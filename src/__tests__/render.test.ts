import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

import { SAMPLE_INPUT, TEST_FIXTURE_INPUTS } from '../__fixtures__/inputs.ts'
import { renderBadge, TRANSPARENT } from '../render.ts'

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), 'utf8')

const stale = (file: string) =>
  `${file} differs — run \`pnpm gen:svg\` if the change is intended`

const widthOf = (svg: string) =>
  Number(svg.match(/^<svg[^>]*width="([\d.]+)"/)?.[1])

describe('committed SVGs', () => {
  // one test per input, so a failure names the file that moved rather than
  // stopping at the first one
  for (const [name, options] of Object.entries(TEST_FIXTURE_INPUTS)) {
    test(`renders the ${name} fixture byte for byte`, () => {
      assert.equal(
        `${renderBadge(options)}\n`,
        read(`../__fixtures__/${name}.svg`),
        stale(`${name}.svg`)
      )
    })
  }

  // the README's image is generated too, so it is pinned the same way
  test('renders sample.svg byte for byte', () => {
    assert.equal(
      `${renderBadge(SAMPLE_INPUT)}\n`,
      read('../../sample.svg'),
      stale('sample.svg')
    )
  })
})

describe('renderBadge', () => {
  test('renders one pill holding every icon and value', () => {
    // values deliberately not SAMPLE_INPUT's, so nobody reads this as a test
    // of the pinned sample and unifies the two
    const svg = renderBadge({
      items: [
        { icon: 'git-commit', value: '128' },
        { icon: 'git-pull-request', value: '45' },
      ],
    })
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
    assert.equal(svg.match(/<rect /g)?.length, 1, 'a single background pill')
    assert.equal(
      svg.match(/<g fill="#8B949E"/g)?.length,
      2,
      'both icons tinted'
    )
    assert.match(svg, />128</)
    assert.match(svg, />45</)
    assert.match(svg, /aria-label="128 git-commit, 45 git-pull-request"/)
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

  test('a wide icon advances by its own width, undistorted', () => {
    // logo-github's viewBox is 49x16, so it must take far more room than a
    // square icon and still scale uniformly
    const wide = renderBadge({ items: [{ icon: 'logo-github', value: '1' }] })
    const square = renderBadge({ items: [{ icon: 'star', value: '1' }] })
    assert.ok(
      widthOf(wide) > widthOf(square) + 20,
      `${widthOf(wide)} should far exceed ${widthOf(square)}`
    )
    const scale = wide.match(/scale\(([\d.]+)\)/)?.[1]
    assert.equal(scale, square.match(/scale\(([\d.]+)\)/)?.[1], 'uniform scale')
  })

  test('draws no background at all when the color is TRANSPARENT', () => {
    const items = [{ icon: 'star', value: '1' }]
    assert.ok(renderBadge({ items }).includes('<rect'))
    const svg = renderBadge({ items, color: TRANSPARENT })
    assert.ok(!svg.includes('<rect'), svg)
    // the badge loses its background, not its contents
    assert.ok(svg.includes('<text'))
    assert.ok(svg.includes('<g fill='))
  })

  test('trimming the padding grows the contents, it does not crop the pill', () => {
    const items = [{ icon: 'star', value: '12' }]
    const sizeOf = (svg: string) => ({
      font: svg.match(/font-size="([\d.]+)"/)?.[1],
      icon: svg.match(/scale\(([\d.]+)\)/)?.[1],
      width: svg.match(/width="([\d.]+)"/)?.[1],
    })
    const full = sizeOf(renderBadge({ items }))
    // six fewer pixels of box, the padding the default leaves, so the
    // contents come out the same size in a shorter pill
    const trimmed = sizeOf(renderBadge({ items, height: 14, padY: 0 }))
    assert.deepEqual(trimmed, full)
  })

  test('iconSide=right swaps the pair without resizing the badge', () => {
    const items = [
      { icon: 'star', value: '12' },
      { icon: 'tag', value: 'v1' },
    ]
    const left = renderBadge({ items })
    const right = renderBadge({ items, iconSide: 'right' })

    const order = (svg: string) =>
      [...svg.matchAll(/<(g|text)\b/g)].map((m) => m[1]).join(' ')
    assert.equal(order(left), 'g text g text')
    assert.equal(order(right), 'text g text g')

    // the pair occupies the same run either way, so the box cannot move.
    // Only the boundary inside the pair does, since an icon and its value
    // are not the same width.
    assert.equal(widthOf(right), widthOf(left))
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
})
