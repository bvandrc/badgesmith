import { mapValues, sumBy } from 'es-toolkit'

import { getIcon } from './icons.ts'
import { textWidth } from './text.ts'

export type BadgeItem = { icon: string; value: string }

/** The `color` that draws no background at all, letting the page show through. */
export const TRANSPARENT = 'none'

/** How the pill looks, independent of what it holds. */
export type BadgeStyle = {
  /**
   * Pill background, hex without the leading '#', or `TRANSPARENT` for none.
   *
   * With no background the icons and text carry their own contrast, so a
   * badge meant for both GitHub themes needs a mid grey rather than the
   * default white text.
   *
   * @default '2f363d' — near-black slate grey, GitHub's dark surface
   */
  color?: string
  /**
   * Icon fill.
   *
   * @default '8B949E' — mid grey, legible on the default background without
   * competing with the value text
   */
  iconColor?: string
  /**
   * Value fill.
   *
   * @default 'fff' — white
   */
  textColor?: string
  /**
   * Pill height in px — the box, which the contents are centred in.
   *
   * @default 20 — shields' own flat-square height
   */
  height?: number
  /**
   * Space above and below the contents in px.
   *
   * The contents scale to the room this leaves rather than to `height`, so
   * trimming it grows the icons and text instead of just cropping the pill.
   * Must leave some room: `padY * 2` below `height`.
   *
   * @default 15% of `height` — the shields proportion, 3px at the default
   */
  padY?: number
  /**
   * Corner radius in px, at the pill's natural height.
   *
   * @default 0 — square corners, matching shields' flat-square
   */
  radius?: number
}

export type BadgeOptions = BadgeStyle & { items: BadgeItem[] }

/** The height the proportions below are expressed at. */
export const BASE_HEIGHT = 20

/**
 * Shields' flat-square proportions at `BASE_HEIGHT`.
 *
 * Matched to shields deliberately, so one of these badges can sit beside a
 * real one without looking out of place.
 */
const BASE_PROPORTIONS = {
  fontSize: 11,
  iconSize: 14,
  // between the pill's edge and its first and last contents
  endPad: 6,
  // between an icon and its own value, kept tighter than itemGap so a pair
  // reads as one thing
  iconGap: 4,
  // between one icon/value pair and the next
  itemGap: 9,
} as const

/**
 * A digit's height as a fraction of its font size, for the fonts below.
 *
 * 8px at the 11px font `BASE_PROPORTIONS` sets. Centring on it reproduces
 * the baseline those proportions were drawn around exactly, which is what
 * keeps a default badge byte-identical now the two can be decoupled.
 */
const DIGIT_CAP_RATIO = 8 / 11

const escapeText = (text: string) =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

const round = (value: number) => Number(value.toFixed(2))

/**
 * One SVG pill holding every icon/value pair, sized to its contents.
 *
 * Pure: no fetches and no external references, because GitHub's image proxy
 * serves the result under `default-src 'none'`.
 *
 * Throws when an item names an icon that does not exist.
 */
export const renderBadge = ({
  items,
  color = '2f363d',
  iconColor = '8B949E',
  textColor = 'fff',
  height = BASE_HEIGHT,
  padY,
  radius = 0,
}: BadgeOptions) => {
  // Contents scale to the room padY leaves rather than to the box, so
  // trimming it grows them instead of cropping the pill. The two branches are
  // algebraically the same at the default padding but not bit for bit — the
  // rounding below can land either side — so an unset padY keeps the original
  // expression, and with it the committed fixtures.
  const scale =
    padY === undefined
      ? height / BASE_HEIGHT
      : (height - 2 * padY) / BASE_PROPORTIONS.iconSize
  const { fontSize, iconSize, endPad, iconGap, itemGap } = mapValues(
    BASE_PROPORTIONS,
    (value) => value * scale
  )

  const measured = items.map((item) => {
    const icon = getIcon(item.icon)
    // octicons are not all square — scale by height and let width follow, so a
    // wide one (logo-github is 49x16) renders undistorted and advances further
    const iconScale = iconSize / icon.height
    return {
      slug: item.icon,
      value: item.value,
      path: icon.path,
      iconScale,
      iconWidth: icon.width * iconScale,
      valueWidth: textWidth(item.value, fontSize),
    }
  })

  const width =
    endPad * 2 +
    sumBy(measured, (m) => m.iconWidth + iconGap + m.valueWidth) +
    itemGap * Math.max(measured.length - 1, 0)

  const iconY = (height - iconSize) / 2
  let x = endPad
  const parts: string[] = []
  for (const m of measured) {
    parts.push(
      `<g fill="#${iconColor}" transform="translate(${round(x)} ${round(iconY)}) scale(${round(m.iconScale)})">${m.path}</g>`
    )
    x += m.iconWidth + iconGap
    parts.push(
      `<text x="${round(x)}" y="${round((height + DIGIT_CAP_RATIO * fontSize) / 2)}" font-family="Verdana,DejaVu Sans,sans-serif" font-size="${round(fontSize)}" fill="#${textColor}">${escapeText(m.value)}</text>`
    )
    x += m.valueWidth + itemGap
  }

  const w = round(width)
  const label = measured.map((m) => `${m.value} ${m.slug}`).join(', ')
  // dropped entirely rather than drawn with fill="none", so a transparent
  // badge carries no element whose only effect would be on its own bounds
  const background =
    color === TRANSPARENT
      ? ''
      : `<rect width="${w}" height="${round(height)}" rx="${round(radius)}" fill="#${color}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${round(height)}" viewBox="0 0 ${w} ${round(height)}" role="img" aria-label="${escapeText(label)}">${background}${parts.join('')}</svg>`
}
