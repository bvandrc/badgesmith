/**
 * Regenerates src/generated/text-widths.ts — the advance widths every badge is
 * measured against.
 *
 * SVG cannot measure text and GitHub's image proxy forbids external fonts, so
 * a badge's width has to be computed before it is drawn. These tables are what
 * that computation reads.
 *
 * Two sources, for one reason. Verdana comes from anafanafo, which carries
 * shields.io's own metrics: re-measuring it here would move every width a
 * published badge already renders at. The rest are read out of the font files
 * themselves, which anafanafo does not carry.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import anafanafo from 'anafanafo'
import { openSync } from 'fontkit'

const OUT = 'src/generated/text-widths.ts'

// printable ASCII; a badge value is 32 characters at most, so anything beyond
// this is rare enough to take the conservative fallback below
const FIRST = 0x20
const LAST = 0x7e

type Face = { fontSize: number; width: (char: string) => number }
/** How far a face's ink reaches from the baseline, as a fraction of font size. */
type Ink = { above: number; below: number }
type Source = {
  /** what the SVG asks for, most exact first */
  family: string
  /** digit height as a fraction of font size, which the baseline centres on */
  capRatio: string
  /** the real ink envelope, which bounds how large text can be set in a box */
  ink: string
  normal: Face
  bold: Face
}

// ******************************************************************************
// font files — everything else
// ******************************************************************************

/**
 * The font file backing a family and style, or throws naming what to install.
 *
 * Asks fontconfig first, which is what resolves the substitutions a reader's
 * browser will make anyway, and falls back to the paths macOS keeps them at.
 */
const findFont = (family: string, style: string) => {
  try {
    const path = execFileSync(
      'fc-match',
      ['-f', '%{file}', `${family}:style=${style}`],
      {
        encoding: 'utf8',
      }
    ).trim()
    // fc-match answers with *something* for any query, so check it is the face
    // asked for rather than whatever fontconfig fell back to
    if (path && openSync(path).familyName === family) {
      return path
    }
  } catch {
    // no fontconfig on this machine; try the known locations below
  }
  const file = `${family.replace(/ /g, '')}-${style}.ttf`
  const candidate = [
    `/usr/share/fonts/truetype/liberation/${file}`,
    `/Library/Fonts/${file}`,
    `${process.env.HOME}/Library/Fonts/${file}`,
  ].find(existsSync)
  if (!candidate) {
    throw new Error(
      `cannot find "${family} ${style}". These tables are generated from the Liberation fonts, which are metric-compatible with the families the badge asks for and freely redistributable, unlike those families themselves. Install them (Debian/Ubuntu: fonts-liberation, macOS: brew install --cask font-liberation) and run this again.`
    )
  }
  return candidate
}

/**
 * How far a face's ink actually reaches above and below the baseline.
 *
 * Measured from the glyphs' own bounding boxes rather than the font's ascent
 * and descent, which describe the line box and run looser than the marks
 * inside it. This is what bounds how large text can be set in a given box, so
 * it has to be the real extent and not the generous one.
 *
 * The widest of both weights, since one badge may be drawn in either.
 */
const inkOf = (family: string, styles: string[]): Ink => {
  let above = 0
  let below = 0
  for (const style of styles) {
    const font = openSync(findFont(family, style))
    for (let code = FIRST; code <= LAST; code++) {
      const { bbox } = font.layout(String.fromCharCode(code)).glyphs[0]
      above = Math.max(above, bbox.maxY / font.unitsPerEm)
      below = Math.max(below, -bbox.minY / font.unitsPerEm)
    }
  }
  return { above, below }
}

const inkLiteral = ({ above, below }: Ink) =>
  `{ above: ${above}, below: ${below} }`

/** A face read straight out of its font file, at the size the table records. */
const fromFile = (family: string, style: string, fontSize: number): Face => {
  const font = openSync(findFont(family, style))
  return {
    fontSize,
    width: (char) =>
      (font.layout(char).glyphs[0].advanceWidth / font.unitsPerEm) * fontSize,
  }
}

/** The ratio the baseline centres on, read from the font's own cap height. */
const capRatioOf = (family: string, style: string) => {
  const font = openSync(findFont(family, style))
  return `${font.capHeight / font.unitsPerEm}`
}

/**
 * A family tabulated from its Liberation counterpart.
 *
 * Liberation was drawn to the same advance widths as the family it stands in
 * for, so the numbers hold whichever of the two a reader actually has — and
 * Liberation is the one a build machine can be relied on to install.
 */
const metricClone = (liberation: string, stack: string): Source => ({
  family: stack,
  capRatio: capRatioOf(liberation, 'Regular'),
  ink: inkLiteral(inkOf(liberation, ['Regular', 'Bold'])),
  // 11px for both, unlike Verdana above: nothing constrains the size a table
  // is measured at, and one pair of sizes is one less thing to explain
  normal: fromFile(liberation, 'Regular', 11),
  bold: fromFile(liberation, 'Bold', 11),
})

// ******************************************************************************
// anafanafo — Verdana only
// ******************************************************************************

// anafanafo carries Verdana at 11px regular and 10px bold, and no other pair
// of them; a caller scales from whichever size its table was measured at, so
// the two needing different sizes costs nothing.
const verdana: Source = {
  family: 'Verdana,DejaVu Sans,sans-serif',
  // 8px at the 11px font the badge proportions are drawn around. Written as
  // the fraction it has always been rather than measured, so the baseline of
  // a default badge stays where the committed fixtures pin it.
  capRatio: '8 / 11',
  // anafanafo carries widths, not outlines, so Verdana's own ink cannot be
  // read here. DejaVu Sans stands in: it is the face the Verdana stack falls
  // to where Verdana is absent, and the deeper inked of the two, so the bound
  // it sets still holds for a reader who has the real thing.
  ink: inkLiteral(inkOf('DejaVu Sans', ['Book', 'Bold'])),
  normal: {
    fontSize: 11,
    width: (c) => anafanafo(c, { font: '11px Verdana' }),
  },
  bold: {
    fontSize: 10,
    width: (c) => anafanafo(c, { font: 'bold 10px Verdana' }),
  },
}

const SOURCES = {
  verdana,
  arial: metricClone(
    'Liberation Sans',
    'Arial,Liberation Sans,Helvetica,sans-serif'
  ),
  times: metricClone(
    'Liberation Serif',
    'Times New Roman,Liberation Serif,Times,serif'
  ),
  courier: metricClone(
    'Liberation Mono',
    'Courier New,Liberation Mono,monospace'
  ),
}

// ******************************************************************************
// emit
// ******************************************************************************

const table = ({ fontSize, width }: Face) => {
  const widths = new Map<string, number>()
  for (let code = FIRST; code <= LAST; code++) {
    const char = String.fromCharCode(code)
    widths.set(char, width(char))
  }
  const entries = [...widths]
    .map(([char, w]) => `        ${JSON.stringify(char)}: ${w},`)
    .join('\n')
  // the widest glyph, so a character absent from the table is never measured
  // too narrow and text cannot overflow the pill
  const fallback = Math.max(...widths.values())
  return `{
      fontSize: ${fontSize},
      fallback: ${fallback},
      chars: {
${entries}
      } as Record<string, number | undefined>,
    }`
}

const faces = Object.entries(SOURCES).map(([name, source]) => ({
  name,
  source,
  body: `  ${name}: {
    family: '${source.family}',
    capRatio: ${source.capRatio},
    ink: ${source.ink},
    normal: ${table(source.normal)},
    bold: ${table(source.bold)},
  },`,
}))

const file = `// GENERATED by scripts/generate-text-widths.ts — run \`pnpm gen:widths\` to refresh.
// Verdana from anafanafo, shields.io's own metrics; the rest read out of the
// Liberation fonts, which carry the advance widths of the families they name.

/**
 * Advance widths per font, measured at \`fontSize\`; a caller scales from it.
 *
 * \`fallback\` is the widest glyph in that face, used for anything absent, so
 * text is never measured too narrow for the pill it has to fit. \`capRatio\`
 * is the font's cap height over its em, which the baseline centres on.
 * \`ink\` is how far its marks reach either side of that baseline, which is
 * what bounds how large the text can be set in a given box.
 */
export const FONT_METRICS = {
${faces.map((f) => f.body).join('\n')}
}
`

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
writeFileSync(join(root, OUT), file)
for (const { name, source } of faces) {
  console.log(
    `${OUT}: ${name} — ${source.normal.fontSize}px normal, ${source.bold.fontSize}px bold, capRatio ${source.capRatio}`
  )
}
