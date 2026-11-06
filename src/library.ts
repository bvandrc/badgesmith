/**
 * The npm package's entry point: the renderer, without the Worker around it.
 *
 * Everything exported here is the package's public API, so semver follows it.
 */

import { validateBadgeOptions } from './badge-options.ts'
import { type BadgeOptions, renderBadge as drawBadge } from './render.ts'

/**
 * One SVG pill holding every icon/value pair, sized to its contents.
 *
 * Holds the options to the same limits the hosted worker does: up to six
 * items, values of 1–64 characters, hex colors, and each size in its range.
 * Throws `InvalidBadgeError`, naming the option and the reason, for any it
 * cannot draw.
 */
export const renderBadge = (options: BadgeOptions) =>
  drawBadge(validateBadgeOptions(options))

// biome-ignore lint/performance/noBarrelFile: the package's one entry point, which tsdown builds from
export { InvalidBadgeError } from './badge-options.ts'
export { hasIcon } from './icons.ts'
export {
  type BadgeItem,
  type BadgeOptions,
  type BadgeStyle,
  ICON_SIDES,
  type IconSide,
  TRANSPARENT,
} from './render.ts'
export { BADGE_FONTS, type BadgeFont } from './text.ts'
