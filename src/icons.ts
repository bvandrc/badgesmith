import { ICONS } from './generated/icons.ts'

export type Icon = {
  /** path markup, already sized to the viewBox below */
  path: string
  width: number
  height: number
}

/** Whether any octicon goes by this slug. */
export const hasIcon = (slug: string) => slug in ICONS

/**
 * The named octicon.
 *
 * Throws if no icon goes by that slug, so a caller holding an unchecked slug
 * tests it with `hasIcon` first — the query layer does, and turns a miss into
 * a 400 rather than letting it surface as a 500.
 */
export const getIcon = (slug: string): Icon => {
  const entry = ICONS[slug]
  if (!entry) {
    throw new Error(`unknown icon: ${slug}`)
  }
  const [path, width, height] = entry
  return { path, width, height }
}
