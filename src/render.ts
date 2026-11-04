import { mapValues, sumBy } from 'es-toolkit'

import { findIcon } from './icons.ts'
import { textWidth } from './text.ts'

export type BadgeItem = { icon: string; value: string }

/** How the pill looks, independent of what it holds. */
export type BadgeStyle = {
  /**
   * Pill background, hex without the leading '#'.
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
   * Pill height in px; every other dimension scales from it.
   *
   * @default 20 — shields' own flat-square height
   */
  height?: number
  /**
   * Corner radius in px, at the pill's natural height.
   *
   * @default 0 — square corners, matching shields' flat-square
   */
  radius?: number
}

export type BadgeOptions = BadgeStyle & { items: BadgeItem[] }

/** The height the proportions below are expressed at. */
const BASE_HEIGHT = 20

/**
 * Shields' flat-square proportions at `BASE_HEIGHT`.
 *
 * Matched to shields deliberately, so one of these badges can sit beside a
 * real one without looking out of place.
 */
const BASE_PROPORTIONS = {
  FONT_SIZE: 11,
  ICON_SIZE: 14,
  // between the pill's edge and its first and last contents
  END_PAD: 6,
  // between an icon and its own value, kept tighter than ITEM_GAP so a pair
  // reads as one thing
  ICON_GAP: 4,
  // between one icon/value pair and the next
  ITEM_GAP: 9,
} as const

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
  radius = 0,
}: BadgeOptions) => {
  // every dimension scales from the requested height
  const {
    FONT_SIZE: fontSize,
    ICON_SIZE: iconSize,
    END_PAD: endPad,
    ICON_GAP: iconGap,
    ITEM_GAP: itemGap,
  } = mapValues(BASE_PROPORTIONS, (value) => value * (height / BASE_HEIGHT))

  const measured = items.map((item) => {
    const icon = findIcon(item.icon)
    if (!icon) {
      throw new Error(`unknown icon: ${item.icon}`)
    }
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
      `<text x="${round(x)}" y="${round(height * 0.7)}" font-family="Verdana,DejaVu Sans,sans-serif" font-size="${round(fontSize)}" fill="#${textColor}">${escapeText(m.value)}</text>`
    )
    x += m.valueWidth + itemGap
  }

  const w = round(width)
  const label = measured.map((m) => `${m.value} ${m.slug}`).join(', ')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${round(height)}" viewBox="0 0 ${w} ${round(height)}" role="img" aria-label="${escapeText(label)}"><rect width="${w}" height="${round(height)}" rx="${round(radius)}" fill="#${color}"/>${parts.join('')}</svg>`
}
