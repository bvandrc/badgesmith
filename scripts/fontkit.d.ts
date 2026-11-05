/**
 * fontkit ships no types for the entry TypeScript resolves, and this script
 * reads two things out of a font: how far each glyph advances, and how tall
 * its capitals are.
 */
declare module 'fontkit' {
  type Glyph = { advanceWidth: number }
  type Font = {
    familyName: string
    unitsPerEm: number
    capHeight: number
    layout(text: string): { glyphs: Glyph[] }
  }
  export function openSync(path: string): Font
}
