import {
  boolean as zBoolean,
  enum as zEnum,
  maximum as zMaximum,
  minimum as zMinimum,
  number as zNumber,
  object as zObject,
  optional as zOptional,
  pipe as zPipe,
  regex as zRegex,
  string as zString,
  transform as zTransform,
} from 'zod/mini'

import { hasIcon } from './icons.ts'
import {
  BASE_HEIGHT,
  type BadgeItem,
  type BadgeOptions,
  type BadgeStyle,
  contentsHeight,
  ICON_SIDES,
  TRANSPARENT,
} from './render.ts'
import { BADGE_FONTS, maxFontSize } from './text.ts'

/**
 * Badge options that would draw something broken, clipped, or unbounded.
 *
 * Its message names the option and the reason, written for whoever supplied
 * the value, since the Worker sends it back as the body of a 400.
 */
export class InvalidBadgeError extends Error {}

// ******************************************************************************
// validateItems
// ******************************************************************************

/** Most icon/value pairs one badge may hold, which bounds the work it takes. */
const MAX_ITEMS = 6

/**
 * Longest value an item may carry, which bounds how wide a pill can get.
 *
 * Room for a phrase rather than only a count or a word, now that an item can
 * be a value on its own and that a value can hold emoji. Counted in code
 * units, so an emoji spends up to three of them — a surrogate pair and the
 * variation selector some carry — and a joined sequence more again. Six items
 * of this is still a bounded width.
 */
const MAX_VALUE_LENGTH = 64

/** Checks a badge's items. Throws `InvalidBadgeError` if one cannot be drawn. */
export const validateItems = (items: BadgeItem[]) => {
  if (items.length === 0) {
    throw new InvalidBadgeError('a badge needs at least one item')
  }
  if (items.length > MAX_ITEMS) {
    throw new InvalidBadgeError(`at most ${MAX_ITEMS} items`)
  }
  for (const { icon, value } of items) {
    if (icon === undefined && !value) {
      throw new InvalidBadgeError('an item needs an icon, a value, or both')
    }
    if (icon !== undefined && !hasIcon(icon)) {
      throw new InvalidBadgeError(
        `unknown icon "${icon}" — any octicon slug works, plus the brand marks listed at https://github.com/bvandrc/badgesmith/blob/main/scripts/simple-icon-slugs.ts. Want one that is missing? Open an issue or a pull request at https://github.com/bvandrc/badgesmith`
      )
    }
    // an empty value draws a gap with nothing in it; an icon alone omits it
    if (value === '') {
      throw new InvalidBadgeError(
        `value for "${icon}" must not be empty — leave it out for an icon alone`
      )
    }
    if (value !== undefined && value.length > MAX_VALUE_LENGTH) {
      throw new InvalidBadgeError(
        `value for "${icon ?? value}" must be at most ${MAX_VALUE_LENGTH} characters`
      )
    }
  }
  return items
}

// ******************************************************************************
// validateStyle
// ******************************************************************************

/** The hex a color may carry, in 3- or 6-digit form. */
const HEX = '[0-9a-fA-F]{3}|[0-9a-fA-F]{6}'

/** A color accepting `pattern`, which reports `message` when it does not. */
const zColorLike = (pattern: string, message: string) =>
  zPipe(
    zString(),
    // a stray leading '#' is dropped rather than rejected, so the value
    // interpolates into `fill="#${value}"` either way
    zTransform((value) => value.replace(/^#/, ''))
  ).check(zRegex(new RegExp(`^(?:${pattern})$`), message))

const zHex = zColorLike(HEX, "must be a 3- or 6-digit hex color without '#'")

// hex matches in either case, while the keyword must be lowercase: the
// renderer compares the value against TRANSPARENT directly, and case-folding
// hex here would move bytes the fixtures pin
const zBackground = zColorLike(
  `${TRANSPARENT}|${HEX}`,
  `must be a 3- or 6-digit hex color without '#', or '${TRANSPARENT}'`
)

const zFlag = zBoolean({ error: 'must be true or false' })

/** A number within an inclusive range. */
const zBounded = (min: number, max: number) => {
  // one message for both ends and for NaN, so the reason a caller reads never
  // depends on how their value was wrong
  const error = `must be a number between ${min} and ${max}`
  return zNumber({ error }).check(zMinimum(min, error), zMaximum(max, error))
}

const styleSchema = zObject({
  color: zOptional(zBackground),
  iconColor: zOptional(zHex),
  textColor: zOptional(zHex),
  // under 12 the text no longer fits the pill it is centred in
  height: zOptional(zBounded(12, 64)),
  padY: zOptional(zBounded(0, 32)),
  // at 1 the icon already fills the height the contents are given, so above
  // that it would run past the badge and be cut off by its edges
  iconScale: zOptional(zBounded(0.25, 1)),
  bold: zOptional(zFlag),
  underline: zOptional(zFlag),
  iconSide: zOptional(
    zEnum(ICON_SIDES, { error: `must be ${ICON_SIDES.join(' or ')}` })
  ),
  radius: zOptional(zBounded(0, 32)),
  font: zOptional(
    zEnum(BADGE_FONTS, { error: `must be one of ${BADGE_FONTS.join(', ')}` })
  ),
  fontSize: zOptional(zBounded(4, 64)),
})

/**
 * Checks a badge's style. Throws `InvalidBadgeError` if an option is invalid.
 *
 * Takes `unknown`, since what it is for is a value nothing has checked yet.
 * Returns the style with a leading '#' dropped from each color and unknown keys
 * removed, which is what the renderer should be given.
 */
export const validateStyle = (style: unknown): BadgeStyle => {
  const parsed = styleSchema.safeParse(style)
  if (!parsed.success) {
    const [issue] = parsed.error.issues
    throw new InvalidBadgeError(`${issue.path.join('.')} ${issue.message}`)
  }
  const { padY, height = BASE_HEIGHT } = parsed.data
  // padding is bounded by the box it sits in, which one field cannot see of
  // the other — left to the renderer it would scale the contents to nothing
  // or past zero
  if (padY !== undefined && padY * 2 >= height) {
    throw new InvalidBadgeError(
      `padY must be under half of height (${height / 2})`
    )
  }
  const { fontSize, font = 'verdana' } = parsed.data
  // text larger than its box would be cut off by the badge's own edges, so it
  // is refused rather than drawn clipped. What fits depends on the face and on
  // the room the padding leaves, neither of which one field can see.
  if (fontSize !== undefined) {
    const max = maxFontSize(font, contentsHeight(parsed.data))
    if (fontSize > max) {
      throw new InvalidBadgeError(
        `fontSize must be at most ${Math.floor(max * 100) / 100} for ${font} in this box — raise height, or lower padY`
      )
    }
  }
  return parsed.data
}

/** Checks a badge's items and style together, as `renderBadge` takes them. */
export const validateBadgeOptions = ({
  items,
  ...style
}: BadgeOptions): BadgeOptions => ({
  ...validateStyle(style),
  items: validateItems(items),
})
