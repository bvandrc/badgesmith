import { ExampleBadge } from './ExampleBadge.tsx'
import { EXAMPLES, HERO } from './examples.ts'

/** The repository, which holds the full parameter reference this page omits. */
const REPO_URL = 'https://github.com/bvandrc/badgesmith'

const CSS = `
:root { color-scheme: light dark; --fg: #1f2328; --bg: #fff; --muted: #59636e; }
@media (prefers-color-scheme: dark) {
  :root { --fg: #f0f6fc; --bg: #0d1117; --muted: #9198a1; }
}
body { margin: 0 auto; padding: 2rem 1rem; max-width: 46rem; background: var(--bg); color: var(--fg);
  font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
h1 { font-size: 1.5rem; margin: 0 0 .25rem; }
p { color: var(--muted); margin: 0 0 1.5rem; }
table { border-collapse: collapse; }
td { padding: .6rem 0; vertical-align: middle; }
/* the badge column takes only what its widest badge needs; the URL wraps */
td:first-child { padding-right: 1.5rem; white-space: nowrap; }
td img { display: block; }
code { display: block; font-size: .8125rem; color: var(--muted); word-break: break-all; }
a { color: inherit; }
footer { margin-top: 2rem; font-size: .875rem; }
`

/**
 * The landing page the worker serves on a bare root — a browser rather than an
 * `<img>`.
 *
 * Its badges are root-relative, so each is rendered by the same deployment
 * serving the page rather than a hard-coded one.
 */
export const UsagePage = () => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>badgesmith</title>
      {/* raw, since a text child is entity-escaped and "Segoe UI" would lose its quotes */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </head>
    <body>
      <h1>badgesmith</h1>
      <p>
        Several icon/value pairs as a single SVG badge. Any{' '}
        <a href="https://primer.style/foundations/icons">octicon</a> slug works,
        plus brand marks for languages and the tools built around them, from{' '}
        <a href="https://simpleicons.org">simple-icons</a>. Those are a curated
        set:{' '}
        <a href="https://github.com/bvandrc/badgesmith/blob/main/scripts/simple-icon-slugs.ts">
          the list
        </a>{' '}
        is open to an issue or a pull request for one it does not carry.
      </p>
      <table>
        {[HERO, ...EXAMPLES].map((example) => (
          <tr key={example.path}>
            <td>
              <ExampleBadge origin="" {...example} />
            </td>
            <td>
              {example.title}
              <code>{example.path}</code>
            </td>
          </tr>
        ))}
      </table>
      <footer>
        <a href={REPO_URL}>Parameter reference and source →</a>
      </footer>
    </body>
  </html>
)
