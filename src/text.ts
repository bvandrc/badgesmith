import { sumBy } from 'es-toolkit'

import {
  CHAR_WIDTHS,
  FALLBACK_WIDTH,
  TABLE_FONT_SIZE,
} from './generated/text-widths.ts'

/**
 * Width of `text` in Verdana at `fontSize`, in px.
 *
 * SVG cannot measure text and GitHub's image proxy forbids external fonts, so
 * the width has to be computed up front. The widths are real Verdana metrics,
 * generated from anafanafo; a character the table does not cover is measured
 * as the widest one it does, so the pill is never too small for its contents.
 */
export const textWidth = (text: string, fontSize: number) =>
  sumBy([...text], (char) => CHAR_WIDTHS[char] ?? FALLBACK_WIDTH) *
  (fontSize / TABLE_FONT_SIZE)
