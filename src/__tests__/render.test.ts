import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

import { SAMPLE_INPUT, TEST_FIXTURE_INPUTS } from '../__fixtures__/inputs.ts'
import { getIcon } from '../icons.ts'
import { BASE_HEIGHT, renderBadge, TRANSPARENT } from '../render.ts'

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), 'utf8')

const round = (n: number) => Number(n.toFixed(2))

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

  test('a value with no icon draws none, and takes no room for one', () => {
    const withIcon = renderBadge({ items: [{ icon: 'star', value: '12' }] })
    const alone = renderBadge({ items: [{ value: '12' }] })

    assert.match(withIcon, /<g fill=/)
    assert.doesNotMatch(alone, /<g fill=/)
    assert.match(alone, /<text /)

    // narrower by the icon and the gap that followed it, not merely by the
    // icon: an absent icon leaves no space behind
    const star = getIcon('star')
    const iconWidth = (star.width / star.height) * 14
    assert.equal(widthOf(alone), round(widthOf(withIcon) - iconWidth - 4))
  })

  test('iconScale shrinks the icon, and keeps it on the middle', () => {
    const items = [{ icon: 'star', value: '12' }]
    const iconOf = (svg: string) => {
      const m = svg.match(/translate\([\d.]+ ([\d.]+)\) scale\(([\d.]+)\)/)
      return { y: Number(m?.[1]), scale: Number(m?.[2]) }
    }
    const full = iconOf(renderBadge({ items }))
    const half = iconOf(renderBadge({ items, iconScale: 0.5 }))

    assert.equal(half.scale, full.scale / 2)
    // narrower, by the width the icon gave up
    assert.ok(
      widthOf(renderBadge({ items, iconScale: 0.5 })) <
        widthOf(renderBadge({ items }))
    )

    // each is drawn half of its own leftover height from the top, so the
    // height it occupies is what its offset implies — and that halves with
    // it, which is what keeps the icon's middle on the badge's
    const drawnHeight = (y: number) => BASE_HEIGHT - 2 * y
    assert.equal(drawnHeight(half.y), drawnHeight(full.y) / 2)
  })

  test('underline marks the text without costing width', () => {
    const items = [
      { icon: 'star', value: '12' },
      { icon: 'tag', value: 'v1' },
    ]
    const plain = renderBadge({ items })
    const lined = renderBadge({ items, underline: true })

    // every value, not just the first
    assert.equal(plain.match(/text-decoration/g), null)
    assert.equal(lined.match(/text-decoration="underline"/g)?.length, 2)

    // an underline does not change what a glyph advances by, so the badge
    // measures the same — this is what makes the width table still right
    assert.equal(widthOf(lined), widthOf(plain))
  })

  test('bold marks every value, and is measured against its own face', () => {
    const items = [
      { icon: 'star', value: '12' },
      { icon: 'tag', value: 'v1' },
    ]
    const plain = renderBadge({ items })
    const heavy = renderBadge({ items, bold: true })

    assert.equal(plain.match(/font-weight/g), null)
    assert.equal(heavy.match(/font-weight="bold"/g)?.length, 2)

    // the bold face advances further, so the pill has to be wider — the
    // whole point of carrying a second table rather than reusing the first
    assert.ok(
      widthOf(heavy) > widthOf(plain),
      `${widthOf(heavy)} should exceed ${widthOf(plain)}`
    )
  })

  test('font draws in that face, and measures against its own metrics', () => {
    const items = [{ value: 'react-toolkit' }]
    const verdana = renderBadge({ items })
    const arial = renderBadge({ items, font: 'arial' })

    assert.match(verdana, /font-family="Verdana,DejaVu Sans,sans-serif"/)
    // the clone carrying the same advance widths is named before the generic,
    // so a reader without Arial still gets the metrics the table holds
    assert.match(
      arial,
      /font-family="Arial,Liberation Sans,Helvetica,sans-serif"/
    )
    // the pill is sized to the face it is drawn in, not to the default's
    assert.ok(
      widthOf(arial) < widthOf(verdana),
      `expected arial (${widthOf(arial)}) to measure narrower than verdana (${widthOf(verdana)})`
    )
  })

  test('font centres the text on its own cap height', () => {
    const items = [{ value: '370' }]
    const baselineOf = (svg: string) =>
      Number(svg.match(/<text[^>]*y="([\d.]+)"/)?.[1])

    // the baseline sits half a cap height below the middle of the box, so a
    // face whose capitals are shorter puts it nearer that middle
    const verdana = baselineOf(renderBadge({ items }))
    const times = baselineOf(renderBadge({ items, font: 'times' }))
    assert.ok(
      times < verdana,
      `expected times (${times}) to sit above verdana's baseline (${verdana})`
    )
    assert.ok(times > BASE_HEIGHT / 2, 'baseline should stay below the middle')
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
