/** The repository, which holds the full parameter reference this page omits. */
const REPO_URL = 'https://github.com/bvandrc/badgesmith'

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
  'items=stable,star:9&color=1f6feb',
  'items=react-toolkit&bold=true&underline=true&color=none&textColor=0969da',
  'items=file-directory:repo&iconScale=0.7&color=none&textColor=4d79b2&iconColor=4d79b2&underline=true',
  'items=git-commit:370,git-pull-request:264&iconSide=right',
  'items=git-commit:547,git-pull-request:0&color=none&iconColor=6E7681&textColor=6E7681&height=14&padY=0',
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
    return `<tr><td><a href="${escapeHtml(path)}"><img src="${escapeHtml(`${origin}${path}`)}" alt="example badge"></a></td><td><code>${escapeHtml(path)}</code></td></tr>`
  }).join('')

  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>badgesmith</title>
<style>
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
code { font-size: .8125rem; color: var(--muted); word-break: break-all; }
a { color: inherit; }
footer { margin-top: 2rem; font-size: .875rem; }
</style>
<h1>badgesmith</h1>
<p>Several icon/value pairs as a single SVG badge. Any
<a href="https://primer.style/foundations/icons">octicon</a> slug works.</p>
<table>${examples}</table>
<footer><a href="${REPO_URL}">Parameter reference and source &rarr;</a></footer>
</html>
`
}
