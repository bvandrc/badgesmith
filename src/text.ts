import { sumBy } from 'es-toolkit'

import { BOLD_WIDTHS, NORMAL_WIDTHS } from './generated/text-widths.ts'

/**
 * Width of `text` in Verdana at `fontSize`, in px.
 *
 * SVG cannot measure text and GitHub's image proxy forbids external fonts, so
 * the width has to be computed up front. The widths are real Verdana metrics,
 * generated from anafanafo; a character the table does not cover is measured
 * as the widest one it does, so the pill is never too small for its contents.
 *
 * `bold` measures against the bold face, whose glyphs advance further than
 * the regular one's — measuring a bold value against regular metrics would
 * leave it wider than the pill drawn for it.
 */
export const textWidth = (text: string, fontSize: number, bold = false) => {
  const widths = bold ? BOLD_WIDTHS : NORMAL_WIDTHS
  return (
    sumBy([...text], (char) => widths.chars[char] ?? widths.fallback) *
    (fontSize / widths.fontSize)
  )
}
