import {
  enum as zEnum,
  maximum as zMaximum,
  minimum as zMinimum,
  object as zObject,
  optional as zOptional,
  pipe as zPipe,
  regex as zRegex,
  string as zString,
  transform as zTransform,
} from 'zod/mini'

import { BadRequestError } from './http.ts'
import { hasIcon } from './icons.ts'
import {
  BASE_HEIGHT,
  type BadgeItem,
  type BadgeStyle,
  ICON_SIDES,
  TRANSPARENT,
} from './render.ts'

// ******************************************************************************
// parseItems
// ******************************************************************************

/** Most icon/value pairs one badge may hold, which bounds a request's work. */
const MAX_ITEMS = 6

/**
 * Longest value an item may carry, which bounds how wide a pill can get.
 *
 * Room for a short label rather than only a count, now that an item can be a
 * value on its own. Six of them is still a bounded width.
 */
const MAX_VALUE_LENGTH = 32

/** Parses `items=icon:value,value,…`. Throws `BadRequestError` if invalid. */
export const parseItems = (raw: string | null) => {
  if (!raw) {
    throw new BadRequestError(
      'items is required, e.g. ?items=git-commit:370,git-pull-request:264'
    )
  }
  const parts = raw.split(',')
  if (parts.length > MAX_ITEMS) {
    throw new BadRequestError(`at most ${MAX_ITEMS} items`)
  }
  const items: BadgeItem[] = []
  for (const part of parts) {
    // `extra` catches a second colon, so `a:b:c` is rejected rather than
    // quietly read as the value `b:c`
    const [head, tail, ...extra] = part.split(':')
    // no colon at all is a value on its own, which draws without an icon
    const [icon, value] = tail === undefined ? [undefined, head] : [head, tail]
    // an empty icon is a stray leading colon, not a value on its own
    if (!value || icon === '' || extra.length > 0) {
      throw new BadRequestError(
        `malformed item "${part}" — expected icon:value, or value alone`
      )
    }
    if (icon !== undefined && !hasIcon(icon)) {
      throw new BadRequestError(
        `unknown icon "${icon}" — any octicon slug works, see https://primer.style/foundations/icons`
      )
    }
    if (value.length > MAX_VALUE_LENGTH) {
      throw new BadRequestError(
        `value for "${icon ?? value}" must be at most ${MAX_VALUE_LENGTH} characters`
      )
    }
    items.push(icon === undefined ? { value } : { icon, value })
  }
  return items
}

// ******************************************************************************
// parseStyle
// ******************************************************************************

/** The hex a color param may carry, in 3- or 6-digit form. */
const HEX = '[0-9a-fA-F]{3}|[0-9a-fA-F]{6}'

/** A color param accepting `pattern`, which reports `message` when it does not. */
const zColorLike = (pattern: string, message: string) =>
  zPipe(
    zString(),
    // a stray leading '#' is dropped rather than rejected, so the value
    // interpolates into `fill="#${value}"` either way
    zTransform((value) => value.replace(/^#/, ''))
  ).check(zRegex(new RegExp(`^(?:${pattern})$`), message))

const zHex = zColorLike(HEX, "must be a 3- or 6-digit hex color without '#'")

// hex matches in either case, while the keyword must be lowercase: the
// renderer compares the parsed value against TRANSPARENT directly, and
// case-folding hex here would move bytes the fixtures pin
const zBackground = zColorLike(
  `${TRANSPARENT}|${HEX}`,
  `must be a 3- or 6-digit hex color without '#', or '${TRANSPARENT}'`
)

/** A param holding a number within an inclusive range. */
const zBoundedParam = (min: number, max: number) => {
  // one message for both ends, and NaN fails both checks, so the reason a
  // caller reads never depends on how their value was wrong
  const error = `must be a number between ${min} and ${max}`
  return zPipe(zString(), zTransform(Number)).check(
    zMinimum(min, error),
    zMaximum(max, error)
  )
}

/**
 * The appearance params, shared by every route.
 *
 * Unrecognised keys are stripped, so a route's own params pass through
 * untouched, and an absent param stays absent for `renderBadge` to default.
 */
const styleSchema = zObject({
  color: zOptional(zBackground),
  iconColor: zOptional(zHex),
  textColor: zOptional(zHex),
  // under 12 the text no longer fits the pill it is centred in
  height: zOptional(zBoundedParam(12, 64)),
  padY: zOptional(zBoundedParam(0, 32)),
  // at 1 the icon already fills the height the contents are given, so above
  // that it would run past the badge and be cut off by its edges
  iconScale: zOptional(zBoundedParam(0.25, 1)),
  iconSide: zOptional(
    zEnum(ICON_SIDES, { error: `must be ${ICON_SIDES.join(' or ')}` })
  ),
  radius: zOptional(zBoundedParam(0, 32)),
})

/**
 * Reads the shared appearance params. Throws `BadRequestError` if one is invalid.
 *
 * The return type is annotated rather than inferred, so the schema drifting
 * from what the renderer accepts is a compile error here.
 */
export const parseStyle = (params: URLSearchParams): BadgeStyle => {
  const parsed = styleSchema.safeParse(Object.fromEntries(params))
  if (parsed.success) {
    const { padY, height = BASE_HEIGHT } = parsed.data
    // padding is bounded by the box it sits in, which one field cannot see
    // of the other — left to the renderer it would scale the contents to
    // nothing or past zero
    if (padY !== undefined && padY * 2 >= height) {
      throw new BadRequestError(
        `padY must be under half of height (${height / 2})`
      )
    }
    return parsed.data
  }
  const [issue] = parsed.error.issues
  throw new BadRequestError(`${issue.path.join('.')} ${issue.message}`)
}
