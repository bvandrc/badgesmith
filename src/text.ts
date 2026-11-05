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
 * Width of `text` in `font` at `fontSize`, in px.
 *
 * SVG cannot measure text and GitHub's image proxy forbids external fonts, so
 * the width has to be computed up front. A character the table does not cover
 * is measured as the widest one it does, so the pill is never too small for
 * its contents.
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
    sumBy([...text], (char) => widths.chars[char] ?? widths.fallback) *
    (fontSize / widths.fontSize)
  )
}
