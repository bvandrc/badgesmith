/**
 * The npm package's entry point: the renderer, without the Worker around it.
 *
 * Everything exported here is the package's public API, so semver follows it.
 * Validation stays with the caller. The Worker's own limits (six items, 64
 * characters per value, the numeric ranges) live in its query parser, not here.
 */

// biome-ignore lint/performance/noBarrelFile: the package's one entry point, which tsdown builds from
export { hasIcon } from './icons.ts'
export {
  type BadgeItem,
  type BadgeOptions,
  type BadgeStyle,
  ICON_SIDES,
  type IconSide,
  renderBadge,
  TRANSPARENT,
} from './render.ts'
export { BADGE_FONTS, type BadgeFont } from './text.ts'
