/** The repository, which holds the full parameter reference this page omits. */
const REPO_URL = 'https://github.com/bvandrc/multi-icon-badge'

/**
 * The query strings this page demonstrates.
 *
 * Each is rendered by the same worker serving the page, so an example cannot
 * claim an output the renderer does not actually produce.
 */
const EXAMPLES = [
  'items=git-commit:370,git-pull-request:264',
  'items=star:1.2k,repo-forked:89&color=1f6feb&iconColor=fff&height=24&radius=6',
  'items=logo-github:49,tag:v2.1.0&radius=10',
] as const

const escapeHtml = (text: string) =>
  text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`)

/**
 * The landing page, served when someone opens the worker's root with no query
 * of their own — a browser rather than an `<img>`.
 *
 * `origin` is the host that served the request, so the examples point back at
 * this same deployment rather than a hard-coded one.
 */
export const usagePage = (origin: string) => {
  const examples = EXAMPLES.map((query) => {
    const path = `/?${query}`
    return `<li><a href="${escapeHtml(path)}"><img src="${escapeHtml(`${origin}${path}`)}" alt="example badge"></a><code>${escapeHtml(path)}</code></li>`
  }).join('')

  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>multi-icon-badge</title>
<style>
:root { color-scheme: light dark; --fg: #1f2328; --bg: #fff; --muted: #59636e; --line: #d1d9e0; }
@media (prefers-color-scheme: dark) {
  :root { --fg: #f0f6fc; --bg: #0d1117; --muted: #9198a1; --line: #3d444d; }
}
body { margin: 0 auto; padding: 2rem 1rem; max-width: 46rem; background: var(--bg); color: var(--fg);
  font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
h1 { font-size: 1.5rem; margin: 0 0 .25rem; }
p { color: var(--muted); margin: 0 0 1.5rem; }
ul { list-style: none; margin: 0; padding: 0; }
li { padding: 1rem 0; border-top: 1px solid var(--line); }
li img { display: block; margin-bottom: .6rem; }
code { font-size: .8125rem; color: var(--muted); word-break: break-all; }
a { color: inherit; }
footer { margin-top: 2rem; font-size: .875rem; }
</style>
<h1>multi-icon-badge</h1>
<p>Several icon/value pairs as a single SVG badge. Any
<a href="https://primer.style/foundations/icons">octicon</a> slug works.</p>
<ul>${examples}</ul>
<footer><a href="${REPO_URL}">Parameter reference and source &rarr;</a></footer>
</html>
`
}
