import {
  enum as zEnum,
  object as zObject,
  optional as zOptional,
  pipe as zPipe,
  string as zString,
  transform as zTransform,
} from 'zod/mini'

import {
  InvalidBadgeError,
  validateItems,
  validateStyle,
} from './badge-options.ts'
import { BadRequestError } from './http.ts'
import type { BadgeItem, BadgeStyle } from './render.ts'

/**
 * Runs `validate`, reporting what it rejects as the caller's to fix.
 *
 * The limits are about a badge rather than a request, so they throw their own
 * error; only here, on the way out of a request, do they become a 400.
 */
const validateAsBadRequest = <T>(validate: () => T) => {
  try {
    return validate()
  } catch (error) {
    if (error instanceof InvalidBadgeError) {
      throw new BadRequestError(error.message)
    }
    throw error
  }
}

// ******************************************************************************
// parseItems
// ******************************************************************************

/** Parses `items=icon:value,value,…`. Throws `BadRequestError` if invalid. */
export const parseItems = (raw: string | null) => {
  if (!raw) {
    throw new BadRequestError(
      'items is required, e.g. ?items=git-commit:370,git-pull-request:264'
    )
  }
  const items: BadgeItem[] = []
  for (const part of raw.split(',')) {
    // `extra` catches a second colon, so `a:b:c` is rejected rather than
    // quietly read as the value `b:c`
    const [head, tail, ...extra] = part.split(':')
    // no colon at all is a value on its own; a trailing one is an icon on its
    // own, which is how a badge stands in for a bare image
    const [icon, value] =
      tail === undefined ? [undefined, head] : [head, tail || undefined]
    // a leading colon leaves no icon before it, and an empty part neither
    if (icon === '' || (!icon && !value) || extra.length > 0) {
      throw new BadRequestError(
        `malformed item "${part}" — expected icon:value, icon: alone, or value alone`
      )
    }
    items.push(
      icon === undefined ? { value: value as string } : { icon, value }
    )
  }
  return validateAsBadRequest(() => validateItems(items))
}

// ******************************************************************************
// parseStyle
// ******************************************************************************

/** A param the query string carries as a word, since it has no bare flags. */
const zFlagParam = zPipe(
  zEnum(['true', 'false'], { error: 'must be true or false' }),
  zTransform((value) => value === 'true')
)

/** A numeric param, which `validateStyle` then holds to its range. */
const zNumberParam = zPipe(zString(), zTransform(Number))

/**
 * The appearance params as typed values, shared by every route.
 *
 * Only what the query string cannot say as a string is converted here: the
 * bounds, the colors, and the enums are `validateStyle`'s, which checks them
 * on the typed values. Unrecognised keys are stripped, so a route's own params
 * pass through untouched.
 */
const styleParamsSchema = zObject({
  color: zOptional(zString()),
  iconColor: zOptional(zString()),
  textColor: zOptional(zString()),
  height: zOptional(zNumberParam),
  padY: zOptional(zNumberParam),
  iconScale: zOptional(zNumberParam),
  bold: zOptional(zFlagParam),
  underline: zOptional(zFlagParam),
  iconSide: zOptional(zString()),
  radius: zOptional(zNumberParam),
  font: zOptional(zString()),
  fontSize: zOptional(zNumberParam),
})

/** Reads the shared appearance params. Throws `BadRequestError` if one is invalid. */
export const parseStyle = (params: URLSearchParams): BadgeStyle => {
  const parsed = styleParamsSchema.safeParse(Object.fromEntries(params))
  if (!parsed.success) {
    const [issue] = parsed.error.issues
    throw new BadRequestError(`${issue.path.join('.')} ${issue.message}`)
  }
  return validateAsBadRequest(() => validateStyle(parsed.data))
}
