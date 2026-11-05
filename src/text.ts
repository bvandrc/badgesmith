import { sumBy } from 'es-toolkit'

import { FONT_METRICS } from './generated/text-widths.ts'

/** The fonts a badge may be drawn in. */
export const BADGE_FONTS = ['verdana', 'arial', 'times', 'courier'] as const

export type BadgeFont = (typeof BADGE_FONTS)[number]

/**
 * Every font's metrics, keyed by the name a caller asks for.
 *
 * The `satisfies` is what ties the generated tables to the names above: a
 * font added to one and not the other is a compile error here.
 */
const METRICS = FONT_METRICS satisfies Record<BadgeFont, unknown>

/**
 * What the SVG asks for, so a reader resolves the face `font` was measured at.
 *
 * Each stack names the metric-compatible alternatives after the family
 * itself — a reader without Arial still gets Arial's advance widths from
 * Liberation Sans, which is what the table holds.
 */
export const fontFamily = (font: BadgeFont) => METRICS[font].family

/**
 * A digit's height in `font` as a fraction of its font size.
 *
 * The baseline centres on this, so a badge's text sits in the middle of the
 * box by its glyphs rather than by the line box around them.
 */
export const digitCapRatio = (font: BadgeFont) => METRICS[font].capRatio

/**
 * How much of its box the ink may take before the edges cut it.
 *
 * The outline extents the tables carry run a little under what a rasteriser
 * actually paints — measured at up to 2.5% across these faces — so the limit
 * is held back by more than that. It costs a caller a few percent of the
 * largest text they could have set, and buys a guarantee that nothing asked
 * for comes out clipped.
 */
const INK_SAFETY = 0.95

/**
 * The largest font size that fits `contentsHeight` without the box cutting it.
 *
 * Text is centred on its cap height, so the baseline sits `capRatio / 2` below
 * the middle. What reaches past the edges from there is the ink above and
 * below that baseline, and whichever end runs out first sets the limit.
 */
export const maxFontSize = (font: BadgeFont, contentsHeight: number) => {
  const { capRatio, ink } = METRICS[font]
  const overTop = 2 * ink.above - capRatio
  const underBottom = capRatio + 2 * ink.below
  return (contentsHeight / Math.max(overTop, underBottom)) * INK_SAFETY
}

/**
 * How far an emoji advances, as a fraction of the font size.
 *
 * Every emoji advances the same: measured at 1.248 across flags, joined
 * sequences and the rest, and identical whichever of these faces is asked
 * for, since none of them has emoji and they all fall through to the one the
 * reader's system provides.
 *
 * Rounded up from that, because which font that is depends on the platform
 * and the measurement can only be taken on one of them. Measuring an emoji
 * short would leave the badge too narrow and clip the end of its text, while
 * measuring it long only leaves a little room spare.
 */
const EMOJI_ADVANCE = 1.3

/**
 * Whether a grapheme is drawn from the reader's emoji font.
 *
 * Regional indicators are the flags, which are not pictographic themselves —
 * a flag is a pair of them, which the segmenter has already joined up.
 */
const isEmoji = (grapheme: string) =>
  /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(grapheme)

/**
 * The space that survives being drawn.
 *
 * SVG collapses a run of ordinary spaces to one, and the CSS that would stop
 * it is blocked by the proxy these are served through, so a caller wanting a
 * gap wider than one space reaches for these instead. It advances exactly as
 * a space does — identical in every face these tables cover — so that is how
 * it is measured, rather than falling to the width of the widest glyph.
 */
const NBSP = '\u00a0'

/** Splits text the way it is drawn: one unit per mark the reader sees. */
const graphemes = (text: string) =>
  [...new Intl.Segmenter().segment(text)].map((entry) => entry.segment)

/**
 * Width of `text` in `font` at `fontSize`, in px.
 *
 * SVG cannot measure text and GitHub's image proxy forbids external fonts, so
 * the width has to be computed up front. A character the table does not cover
 * is measured as the widest one it does, so the pill is never too small for
 * its contents.
 *
 * Counted by grapheme rather than by code point, because what the reader sees
 * as one mark advances once however many code points it is built from — an
 * emoji carrying a variation selector would otherwise be measured twice, and
 * a flag or a joined sequence several times over.
 *
 * `bold` measures against the bold face, whose glyphs advance further than
 * the regular one's — measuring a bold value against regular metrics would
 * leave it wider than the pill drawn for it.
 */
export const textWidth = (
  text: string,
  fontSize: number,
  { font = 'verdana', bold = false }: { font?: BadgeFont; bold?: boolean } = {}
) => {
  const widths = METRICS[font][bold ? 'bold' : 'normal']
  return (
    sumBy(graphemes(text), (grapheme) =>
      // the emoji figure is a fraction of the font size, so it is expressed
      // against the size this table was measured at and scaled with the rest
      isEmoji(grapheme)
        ? EMOJI_ADVANCE * widths.fontSize
        : (widths.chars[grapheme === NBSP ? ' ' : grapheme] ?? widths.fallback)
    ) *
    (fontSize / widths.fontSize)
  )
}
