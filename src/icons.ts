import { ICONS } from './icons.generated.ts'

export type Icon = {
  /** path markup, already sized to the viewBox below */
  path: string
  width: number
  height: number
}

/** The named octicon, or undefined when no icon goes by that slug. */
export const findIcon = (slug: string): Icon | undefined => {
  const entry = ICONS[slug]
  if (!entry) {
    return undefined
  }
  const [path, width, height] = entry
  return { path, width, height }
}
