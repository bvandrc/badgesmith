/** The repository, which holds the full parameter reference this page omits. */
const REPO_URL = 'https://github.com/bvandrc/badgesmith'

/**
 * The paths this page demonstrates, a provider's among them.
 *
 * Each is rendered by the same worker serving the page, so an example cannot
 * claim an output the renderer does not actually produce.
 */
const EXAMPLES = [
  '/github?repo=bvandrc/badgesmith',
  '/?items=git-commit:370,git-pull-request:264',
  '/?items=star:1.2k,repo-forked:89,eye:42&color=1f6feb&iconColor=fff&radius=6',
  '/?items=check-circle:passing,shield-check:A%2B,versions:v2.1.0&color=1a7f37&iconColor=fff',
  '/?items=stable,tag:v2.1.0,law:MIT&color=8250df&iconColor=fff',
  '/?items=issue-opened:12,issue-closed:340,git-merge:211,comment-discussion:58,people:23,heart:1k&radius=4',
  '/?items=flame:hot,zap:fast,rocket:shipped&color=bf3989&iconColor=fff&bold=true&radius=10',
  '/?items=logo-github:49,tag:v2.1.0&height=28&radius=14',
  '/?items=git-commit:370,git-pull-request:264&iconSide=right',
  '/?items=clock:2h,calendar:Nov%202026&color=f6f8fa&textColor=1f2328&iconColor=59636e&radius=6',
  '/?items=react-toolkit&bold=true&underline=true&color=none&textColor=0969da',
  '/?items=book:docs&bold=true&underline=true&color=none&textColor=0969da&iconColor=0969da&iconScale=0.7',
  '/?items=file-directory:repo&iconScale=0.7&color=none&textColor=4d79b2&iconColor=4d79b2&underline=true',
  '/?items=git-commit:547,git-pull-request:0&color=none&iconColor=6E7681&textColor=6E7681&height=14&padY=0',
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
  const examples = EXAMPLES.map(
    (path) =>
      `<tr><td><a href="${escapeHtml(path)}"><img src="${escapeHtml(`${origin}${path}`)}" alt="example badge"></a></td><td><code>${escapeHtml(path)}</code></td></tr>`
  ).join('')

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
