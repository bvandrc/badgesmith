import { render } from 'preact-render-to-string'

import { ExampleBadge } from './ExampleBadge.tsx'
import { EXAMPLES, type Example, HERO, WORKER_ORIGIN } from './examples.ts'

const FENCE = '```'

/** A fenced code block, which GitHub gives a copy button that inline HTML lacks. */
const codeBlock = (code: string, lang = '') =>
  `${FENCE}${lang}\n${code}\n${FENCE}`

/** One example: its title, the badge itself, and the URL to copy. */
const exampleSection = (example: Example) => `**${example.title}**

${render(<ExampleBadge origin={WORKER_ORIGIN} {...example} />)}

${codeBlock(`${WORKER_ORIGIN}${example.path}`)}`

/** The README's markdown, its badges rendered against the deployed worker. */
export const readme = `<!-- GENERATED FILE — do not edit directly. Edit site/ and run \`pnpm gen:pages\` -->

# badgesmith

Renders several icon/value pairs as a **single** SVG badge, on demand.

${render(<ExampleBadge origin={WORKER_ORIGIN} {...HERO} />)}

${codeBlock(`${WORKER_ORIGIN}${HERO.path}`)}

Open [the worker](${WORKER_ORIGIN}) in a browser for a page of live examples.

## Examples

Every badge below is fetched live from the deployed worker — copy a URL, change the values, and use it as an image anywhere.

${EXAMPLES.map(exampleSection).join('\n\n')}

In a README, use markdown or an \`<img>\` tag — the latter lets you align it:

${codeBlock(`![commits and pull requests](${WORKER_ORIGIN}/github?repo=owner/name)`, 'md')}

${codeBlock(`<img src="${WORKER_ORIGIN}/github?repo=owner/name" align="right" alt="commits and pull requests">`, 'html')}

## Why this exists

shields.io supports exactly **one** logo per badge, and hard-codes custom SVG logos to a 14×14 box (\`DEFAULT_LOGO_HEIGHT\`; the aspect-preserving \`logoSize=auto\` path only runs for named simple-icons). The PR that would have lifted that, [badges/shields#11093](https://github.com/badges/shields/pull/11093), was closed unmerged.

So several icons mean several images, and a row of images is not one badge. They size independently, wrap independently, load and fail independently, and the gap between them belongs to whatever is rendering them rather than to you. One request returning one SVG gives you a single element to place, with the spacing settled where the badge is drawn.

That last point bites hardest wherever the host adds spacing you can't override. A GitHub README is one such place: its markdown CSS applies \`padding-left: 20px\` to every \`img[align=right]\`, and since only \`<img>\` and \`<table>\` float via the \`align\` attribute, two right-aligned badges can never sit flush there.

## Routes

### \`GET /\` — the usage page

Opening the root with no query returns an HTML page of the same examples as above, each rendered by the worker serving it. Any query at all means a badge was intended, so a malformed one still gets a 400 rather than the page.

### \`GET /?items=…\` — explicit values

| param | default | notes |
| --- | --- | --- |
| \`items\` | _required_ | comma-separated \`icon:value\` pairs, up to 6; a value alone draws without an icon; value 1–64 chars |
| \`color\` | \`2f363d\` | pill background, 3- or 6-digit hex, no \`#\`, or \`none\` for no background |
| \`iconColor\` | \`8B949E\` |  |
| \`textColor\` | \`fff\` |  |
| \`height\` | \`20\` | 12–64; the box the contents are centred in |
| \`padY\` | 15% of \`height\` | 0–32; space above and below the contents, under half of \`height\` |
| \`iconSide\` | \`left\` | \`left\` or \`right\`; which side of its value each icon sits on |
| \`iconScale\` | \`1\` | 0.25–1; how large each icon is against its value |
| \`bold\` | \`false\` | \`true\` or \`false\`; draws every value in the bold face |
| \`underline\` | \`false\` | \`true\` or \`false\`; draws a line under every value |
| \`radius\` | \`0\` | corner radius; \`0\` matches shields' flat-square |
| \`font\` | \`verdana\` | \`verdana\`, \`arial\`, \`times\` or \`courier\` |
| \`fontSize\` | from the box | text size in px, independent of \`height\` |

\`bold=true\` draws the values in Verdana's bold face, measured against that face's own metrics — its glyphs advance further than the regular one's, so measuring bold text against regular widths would leave it wider than the pill drawn for it.

\`underline=true\` draws a line under every value, which costs no width: an underline does not change what a glyph advances by, so the measured text stays the right size. It is a presentation attribute rather than CSS, so GitHub's image proxy serves it intact.

\`font\` picks the face every value is drawn in. Only families a reader already has, since the proxy serving these SVGs forbids fetching a font — and only ones whose advance widths are known, because the pill has to be sized before it is drawn. Each face is measured against its own metrics and centred on its own cap height, so the text fits and sits level whichever is chosen. The stacks name a metric-compatible clone after the family itself (\`Arial,Liberation Sans,Helvetica,sans-serif\`), so a reader without the family still gets the widths the table holds.

A run of ordinary spaces in a value collapses to one when the SVG is drawn, and the CSS that would stop that is blocked by the proxy these are served through — so use non-breaking spaces (\`%C2%A0\`) for a wider gap. They are measured as spaces, which is exactly what they advance as.

Values may carry emoji. They are drawn from the reader's own emoji font, which keeps their colour — a \`textColor\` does not flatten them — and they are measured by grapheme, so one carrying a variation selector, a flag, or a joined sequence takes a single advance rather than one per code point.

\`fontSize\` sets the text size directly, instead of letting the box set it. By default the text scales with the room \`padY\` leaves, which ties how large it reads to how tall the badge is — and the height is what badges align by, since an image sits on the line's baseline and a badge centres its contents, so equal heights put equal centres. Setting \`fontSize\` decouples the two: a badge can hold larger text and still line up with the ones beside it. Only the text moves; the icons, the end padding and the gaps still follow the box.

Text too large for its box is refused rather than drawn clipped. The limit depends on the face as well as the room the padding leaves, and the error names it.

\`iconScale\` draws the icons smaller against their values. At 1 an icon fills the height the contents are given, which is taller than the text beside it; lower brings it nearer the text's own size, and the badge narrows by what the icon gives up. It stops at 1 because the icon already fills that height — a larger one would run past the badge and be cut off by its edges.

\`iconSide=right\` draws each icon after its own value instead of before it. The badge is the same width either way — only the order within a pair changes — and the \`aria-label\` still reads \`370 git-commit\`, since it says what the badge holds rather than how it is arranged.

Contents scale to the room \`padY\` leaves them, not to \`height\`, so trimming the padding grows the icons and text rather than cropping the pill. \`height=14&padY=0\` renders the default 11px text in a 14px box — 14px being as short as it goes at that text size, since the icon is the taller of the two. Going shorter still is allowed and shrinks the text with it.

\`color=none\` draws no background, so the badge sits on whatever is behind it. Nothing then separates the badge from the page, so \`iconColor\` and \`textColor\` have to carry their own contrast — a README shown on both GitHub themes wants a mid grey such as \`6E7681\` rather than the default white text, which disappears on a light background.

Values live in the URL, so a changed value is a different URL — the response is cached for a week and can never go stale.

### \`GET /<provider>\` — live values

A **provider** looks values up itself, for a fixed set of icons, so the URL holds no numbers — which is what keeps a generated README reproducible while the numbers stay current. Cached an hour; a lookup that fails renders \`?\` with a 5-minute cache rather than breaking the image. The style params above apply here too.

#### \`github\`

\`GET /github?repo=owner/name\` renders \`git-commit\` and \`git-pull-request\` with the repo's total commits and pull requests. Set a token to raise the rate limit (Cloudflare egress IPs are shared, so the unauthenticated 60/hour is easy to exhaust):

${codeBlock('wrangler secret put GITHUB_TOKEN', 'sh')}

Private repos aren't readable this way — pass their numbers to \`/\` instead.

### Icons

Any [octicon](https://primer.style/foundations/icons) slug works — all 408 of them, square or not — plus 183 brand marks from [simple-icons](https://simpleicons.org) for languages and the tools built around them. Those are a curated set rather than the whole 3,467-icon catalogue, which would be 4.4MB of path data: the list is [scripts/simple-icon-slugs.ts](https://github.com/bvandrc/badgesmith/blob/main/scripts/simple-icon-slugs.ts). Where a slug belongs to both, the octicon keeps it. Something missing? [Open an issue](https://github.com/bvandrc/badgesmith/issues/new) asking for it, or a pull request adding its slug to [that file](https://github.com/bvandrc/badgesmith/blob/main/scripts/simple-icon-slugs.ts) — anything [simple-icons](https://simpleicons.org) has can go in.

An item may be an icon on its own, written with a trailing colon — \`items=react:\`. It draws to the same box as the badges beside it, so it centres with them, which a bare \`<img>\` of the same mark cannot: an image sits on the line's baseline instead.

An item may be an icon on its own, written with a trailing colon — \`items=shield-check:\`. It draws to the same box as the badges beside it, so it centres with them, which a bare \`<img>\` of the same mark cannot: an image sits on the line's baseline instead.

## As a package

The renderer is also published to npm, for drawing a badge without the worker: at build time, or behind a server of your own.

${codeBlock('pnpm add badgesmith', 'sh')}

${codeBlock(
  `import { renderBadge } from 'badgesmith'

const svg = renderBadge({
  items: [
    { icon: 'git-commit', value: '370' },
    { icon: 'git-pull-request', value: '264' },
  ],
  height: 18,
})`,
  'ts'
)}

\`renderBadge\` takes \`items\` plus the same style options as the query params above, typed rather than as strings, and returns the SVG as a string. It holds them to the same limits the worker does, and throws an \`InvalidBadgeError\` naming the option and the reason for any it cannot draw. \`hasIcon\` checks a slug before you pass it.

## Development

Issues and pull requests are both welcome. [Open an issue](https://github.com/bvandrc/badgesmith/issues/new) for a bug, a missing icon, or an idea, or send a pull request with the change itself.

${codeBlock(
  `pnpm install
pnpm dev       # the worker, locally
pnpm check     # lint and types
pnpm test
pnpm gen:all   # regenerate the README, fixtures, and tables; CI fails if they drift`,
  'sh'
)}

Why the icon registry and the width table are generated, the constraints the renderer works under, and the rest of the commands are in [docs/internals.md](./docs/internals.md).
`
