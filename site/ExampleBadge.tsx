import type { Example } from './examples.ts'

export type ExampleBadgeProps = Example & {
  /** the worker to fetch it from; empty for a page that worker itself serves */
  origin: string
}

/** An example badge, linked to its own URL so a click opens the bare SVG. */
export const ExampleBadge = ({ origin, title, path }: ExampleBadgeProps) => (
  <a href={`${origin}${path}`}>
    <img src={`${origin}${path}`} alt={title} />
  </a>
)
