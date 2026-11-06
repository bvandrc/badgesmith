import { mapValues, sumBy } from 'es-toolkit'

import { getIcon } from './icons.ts'
import { type BadgeFont, digitCapRatio, fontFamily, textWidth } from './text.ts'

/**
 * One thing the badge holds: an icon and its value, or either on its own.
 *
 * An icon alone is how a badge stands in for a bare image — drawn to the same
 * box as the badges beside it, so it centres with them rather than sitting on
 * the line's baseline as an `<img>` would.
 */
export type BadgeItem =
  | { icon: string; value?: string }
  | { icon?: string; value: string }

/** The sides an icon may sit on, relative to its own value. */
export const ICON_SIDES = ['left', 'right'] as const

export type IconSide = (typeof ICON_SIDES)[number]

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
   * Draws every value in the bold face.
   *
   * Measured against its own metrics, so the pill is the width the heavier
   * glyphs actually need.
   *
   * @default false
   */
  bold?: boolean
  /**
   * Draws a line under every value.
   *
   * Costs nothing in width: an underline does not change what a glyph
   * advances by, so the measured text is still the right size.
   *
   * @default false
   */
  underline?: boolean
  /**
   * How large each icon is against its own value, as a fraction of normal.
   *
   * 1 leaves an icon filling the height the contents are given, which is
   * taller than the text beside it; smaller draws it nearer the text's own
   * size. It cannot go above 1: the icon already fills that height, so a
   * larger one would run past the badge and be cut off by its edges.
   *
   * @default 1
   */
  iconScale?: number
  /**
   * Which side of its value each icon sits on.
   *
   * The badge is the same width either way: only the order within a pair
   * changes, not the room it takes.
   *
   * @default 'left' — the icon leads, as shields' logo does
   */
  iconSide?: IconSide
  /**
   * Corner radius in px, at the pill's natural height.
   *
   * @default 0 — square corners, matching shields' flat-square
   */
  radius?: number
  /**
   * Text size in px, overriding the size the box would otherwise set.
   *
   * By default the text scales with the room `padY` leaves, at the renderer's
   * own ratio of font to icon box. Setting it decouples the two, so a badge
   * can hold larger text without growing the box its neighbours align to.
   * Too large for that box is an error rather than a crop.
   *
   * @default 11/14 of the room the contents are given
   */
  fontSize?: number
  /**
   * Which face every value is drawn in.
   *
   * Only families a reader already has, since the proxy serving this SVG
   * forbids fetching a font. Each is measured against its own metrics, so the
   * pill is the width that face actually needs.
   *
   * @default 'verdana' — shields' own font
   */
  font?: BadgeFont
}

export type BadgeOptions = BadgeStyle & { items: BadgeItem[] }

/** The height the proportions below are expressed at. */
export const BASE_HEIGHT = 20

/**
 * The room the contents are given, which the text is sized against.
 *
 * Mirrors the two branches `renderBadge` scales by, so a caller can ask what
 * a `fontSize` will have to fit inside before handing one over.
 */
export const contentsHeight = ({
  height = BASE_HEIGHT,
  padY,
}: Pick<BadgeStyle, 'height' | 'padY'>) =>
  padY === undefined
    ? (height / BASE_HEIGHT) * BASE_PROPORTIONS.iconSize
    : height - 2 * padY

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
  iconSide = 'left',
  iconScale = 1,
  underline = false,
  bold = false,
  font = 'verdana',
  fontSize: fontSizeOverride,
}: BadgeOptions) => {
  // the Worker accepts only hex here, but a package caller reaches this
  // directly, so the colours are escaped before they land in an attribute
  const [fill, iconFill, textFill] = [color, iconColor, textColor].map(
    escapeText
  )
  // Contents scale to the room padY leaves rather than to the box, so
  // trimming it grows them instead of cropping the pill. The two branches are
  // algebraically the same at the default padding but not bit for bit — the
  // rounding below can land either side — so an unset padY keeps the original
  // expression, and with it the committed fixtures.
  const scale =
    padY === undefined
      ? height / BASE_HEIGHT
      : (height - 2 * padY) / BASE_PROPORTIONS.iconSize
  const {
    fontSize: scaledFontSize,
    iconSize,
    endPad,
    iconGap,
    itemGap,
  } = mapValues(BASE_PROPORTIONS, (value) => value * scale)
  // only the text is decoupled: the icons, the end padding and the gaps still
  // follow the box, so a badge keeps the proportions of the ones beside it
  const fontSize = fontSizeOverride ?? scaledFontSize

  const measured = items.map((item) => {
    const icon = item.icon === undefined ? undefined : getIcon(item.icon)
    // octicons are not all square — scale by height and let width follow, so a
    // wide one (logo-github is 49x16) renders undistorted and advances further
    // what the icon's own path is drawn at, shrunk by what the caller asked
    const drawScale = icon ? (iconSize * iconScale) / icon.height : 0
    return {
      slug: item.icon,
      value: item.value,
      path: icon?.path,
      drawScale,
      iconWidth: icon ? icon.width * drawScale : 0,
      iconHeight: icon ? icon.height * drawScale : 0,
      valueWidth:
        item.value === undefined
          ? 0
          : textWidth(item.value, fontSize, { font, bold }),
    }
  })

  const width =
    endPad * 2 +
    // the gap between an icon and its value belongs to neither on its own, so
    // an item missing either takes only what it has
    sumBy(
      measured,
      (m) =>
        m.iconWidth +
        (m.path && m.value !== undefined ? iconGap : 0) +
        m.valueWidth
    ) +
    itemGap * Math.max(measured.length - 1, 0)

  let x = endPad
  const parts: string[] = []
  const baseline = round((height + digitCapRatio(font) * fontSize) / 2)
  for (const m of measured) {
    const icon = (at: number) =>
      `<g fill="#${iconFill}" transform="translate(${round(at)} ${round((height - m.iconHeight) / 2)}) scale(${round(m.drawScale)})">${m.path}</g>`
    // only ever called for an item that has one; the fallback is for the
    // compiler, which cannot see that from here
    const value = (at: number) =>
      `<text x="${round(at)}" y="${baseline}" font-family="${fontFamily(font)}" font-size="${round(fontSize)}" fill="#${textFill}"${bold ? ' font-weight="bold"' : ''}${underline ? ' text-decoration="underline"' : ''}>${escapeText(m.value ?? '')}</text>`

    // either on its own is drawn where the pair would have started
    if (!m.path) {
      parts.push(value(x))
      x += m.valueWidth + itemGap
      continue
    }
    if (m.value === undefined) {
      parts.push(icon(x))
      x += m.iconWidth + itemGap
      continue
    }
    // the pair occupies the same run either way, so only what is drawn at
    // each end of it changes
    const [first, second, firstWidth] =
      iconSide === 'left'
        ? [icon, value, m.iconWidth]
        : [value, icon, m.valueWidth]
    parts.push(first(x))
    x += firstWidth + iconGap
    parts.push(second(x))
    x += (iconSide === 'left' ? m.valueWidth : m.iconWidth) + itemGap
  }

  const w = round(width)
  // reads as "19 git-commit" whichever side the icon is drawn on: the label
  // is what the badge says, not how it is laid out
  const label = measured
    .map((m) =>
      m.slug === undefined
        ? m.value
        : m.value === undefined
          ? m.slug
          : `${m.value} ${m.slug}`
    )
    .join(', ')
  // dropped entirely rather than drawn with fill="none", so a transparent
  // badge carries no element whose only effect would be on its own bounds
  const background =
    color === TRANSPARENT
      ? ''
      : `<rect width="${w}" height="${round(height)}" rx="${round(radius)}" fill="#${fill}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${round(height)}" viewBox="0 0 ${w} ${round(height)}" role="img" aria-label="${escapeText(label)}">${background}${parts.join('')}</svg>`
}
