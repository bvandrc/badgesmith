/**
 * Verdana advance widths at 11px, for sizing the badge to its text.
 *
 * SVG cannot measure text and GitHub's image proxy forbids external fonts, so
 * the width has to be computed up front. Digits — the overwhelming case — are
 * exact; other characters fall back to a per-case average, biased slightly
 * high so text never overflows the pill.
 */
const ADVANCE_11PX: Record<string, number> = {
  ' ': 3.87,
  '.': 3.87,
  ',': 3.87,
  ':': 3.87,
  '-': 4.6,
  '/': 4.89,
  '+': 7.3,
  '%': 11.2,
  k: 6.26,
  m: 9.78,
  K: 8.0,
  M: 10.0,
}
for (const digit of '0123456789') {
  ADVANCE_11PX[digit] = 6.99
}

const fallback = (char: string) => (/[A-Z]/.test(char) ? 7.8 : 6.3)

export const textWidth = (text: string, fontSize: number) =>
  [...text].reduce(
    (total, char) => total + (ADVANCE_11PX[char] ?? fallback(char)),
    0
  ) *
  (fontSize / 11)
