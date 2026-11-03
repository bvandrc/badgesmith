import { ICONS } from './icons.ts'
import { textWidth } from './text.ts'

export type BadgeItem = { icon: string; value: string }

export type BadgeOptions = {
  items: BadgeItem[]
  /** pill background, hex without the leading '#' */
  color?: string
  iconColor?: string
  textColor?: string
  height?: number
  /** corner radius; 0 matches shields' flat-square */
  radius?: number
}

// proportions of shields' flat-square at its natural 20px height
const BASE_HEIGHT = 20
const FONT_SIZE = 11
const ICON_SIZE = 14
const END_PAD = 6
const ICON_GAP = 4
const ITEM_GAP = 9

const escapeText = (text: string) =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

const round = (value: number) => Number(value.toFixed(2))

/**
 * One SVG pill holding every icon/value pair, sized to its contents.
 *
 * Pure: no fetches and no external references, because GitHub's image proxy
 * serves the result under `default-src 'none'`.
 */
export const renderBadge = ({
  items,
  color = '2f363d',
  iconColor = '8B949E',
  textColor = 'fff',
  height = BASE_HEIGHT,
  radius = 0,
}: BadgeOptions) => {
  const scale = height / BASE_HEIGHT
  const fontSize = FONT_SIZE * scale
  const iconSize = ICON_SIZE * scale
  const endPad = END_PAD * scale
  const iconGap = ICON_GAP * scale
  const itemGap = ITEM_GAP * scale

  const measured = items.map((item) => {
    const path = ICONS[item.icon]
    if (!path) {
      throw new Error(`unknown icon: ${item.icon}`)
    }
    return { ...item, path, width: textWidth(item.value, fontSize) }
  })

  const width =
    endPad * 2 +
    measured.reduce((total, m) => total + iconSize + iconGap + m.width, 0) +
    itemGap * Math.max(measured.length - 1, 0)

  const iconY = (height - iconSize) / 2
  let x = endPad
  const parts: string[] = []
  for (const m of measured) {
    parts.push(
      `<g fill="#${iconColor}" transform="translate(${round(x)} ${round(iconY)}) scale(${round(iconSize / 16)})">${m.path}</g>`
    )
    x += iconSize + iconGap
    parts.push(
      `<text x="${round(x)}" y="${round(height * 0.7)}" font-family="Verdana,DejaVu Sans,sans-serif" font-size="${round(fontSize)}" fill="#${textColor}">${escapeText(m.value)}</text>`
    )
    x += m.width + itemGap
  }

  const w = round(width)
  const label = measured.map((m) => `${m.value} ${m.icon}`).join(', ')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${round(height)}" viewBox="0 0 ${w} ${round(height)}" role="img" aria-label="${escapeText(label)}"><rect width="${w}" height="${round(height)}" rx="${round(radius)}" fill="#${color}"/>${parts.join('')}</svg>`
}
