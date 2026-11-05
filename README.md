# badgesmith

Renders several icon/value pairs as a **single** SVG badge, on demand.

[![370 commits, 264 pull requests](https://badgesmith.bvandrc.workers.dev/?items=git-commit:370,git-pull-request:264)](https://badgesmith.bvandrc.workers.dev/?items=git-commit:370,git-pull-request:264)

```
https://badgesmith.bvandrc.workers.dev/?items=git-commit:370,git-pull-request:264
```

Open [the worker](https://badgesmith.bvandrc.workers.dev) in a browser for a page of live examples.

## Examples

Every badge below is fetched live from the deployed worker — copy a URL, change the values, and use it as an image anywhere.

**Live numbers for any public repo, looked up by the worker**

[![Live numbers for any public repo, looked up by the worker](https://badgesmith.bvandrc.workers.dev/github?repo=bvandrc/badgesmith)](https://badgesmith.bvandrc.workers.dev/github?repo=bvandrc/badgesmith)

```
https://badgesmith.bvandrc.workers.dev/github?repo=bvandrc/badgesmith
```

**Your own colors, rounded corners**

[![Your own colors, rounded corners](https://badgesmith.bvandrc.workers.dev/?items=star:1.2k,repo-forked:89,eye:42&color=1f6feb&iconColor=fff&radius=6)](https://badgesmith.bvandrc.workers.dev/?items=star:1.2k,repo-forked:89,eye:42&color=1f6feb&iconColor=fff&radius=6)

```
https://badgesmith.bvandrc.workers.dev/?items=star:1.2k,repo-forked:89,eye:42&color=1f6feb&iconColor=fff&radius=6
```

**Status and version, not just counts**

[![Status and version, not just counts](https://badgesmith.bvandrc.workers.dev/?items=check-circle:passing,shield-check:A%2B,versions:v2.1.0&color=1a7f37&iconColor=fff)](https://badgesmith.bvandrc.workers.dev/?items=check-circle:passing,shield-check:A%2B,versions:v2.1.0&color=1a7f37&iconColor=fff)

```
https://badgesmith.bvandrc.workers.dev/?items=check-circle:passing,shield-check:A%2B,versions:v2.1.0&color=1a7f37&iconColor=fff
```

**A value with no icon reads as a label**

[![A value with no icon reads as a label](https://badgesmith.bvandrc.workers.dev/?items=stable,tag:v2.1.0,law:MIT&color=8250df&iconColor=fff)](https://badgesmith.bvandrc.workers.dev/?items=stable,tag:v2.1.0,law:MIT&color=8250df&iconColor=fff)

```
https://badgesmith.bvandrc.workers.dev/?items=stable,tag:v2.1.0,law:MIT&color=8250df&iconColor=fff
```

**Up to six items**

[![Up to six items](https://badgesmith.bvandrc.workers.dev/?items=issue-opened:12,issue-closed:340,git-merge:211,comment-discussion:58,people:23,heart:1k&radius=4)](https://badgesmith.bvandrc.workers.dev/?items=issue-opened:12,issue-closed:340,git-merge:211,comment-discussion:58,people:23,heart:1k&radius=4)

```
https://badgesmith.bvandrc.workers.dev/?items=issue-opened:12,issue-closed:340,git-merge:211,comment-discussion:58,people:23,heart:1k&radius=4
```

**Bold values, fully rounded**

[![Bold values, fully rounded](https://badgesmith.bvandrc.workers.dev/?items=flame:hot,zap:fast,rocket:shipped&color=bf3989&iconColor=fff&bold=true&radius=10)](https://badgesmith.bvandrc.workers.dev/?items=flame:hot,zap:fast,rocket:shipped&color=bf3989&iconColor=fff&bold=true&radius=10)

```
https://badgesmith.bvandrc.workers.dev/?items=flame:hot,zap:fast,rocket:shipped&color=bf3989&iconColor=fff&bold=true&radius=10
```

**Taller, as a pill**

[![Taller, as a pill](https://badgesmith.bvandrc.workers.dev/?items=logo-github:49,tag:v2.1.0&height=28&radius=14)](https://badgesmith.bvandrc.workers.dev/?items=logo-github:49,tag:v2.1.0&height=28&radius=14)

```
https://badgesmith.bvandrc.workers.dev/?items=logo-github:49,tag:v2.1.0&height=28&radius=14
```

**Icons after their values**

[![Icons after their values](https://badgesmith.bvandrc.workers.dev/?items=git-commit:370,git-pull-request:264&iconSide=right)](https://badgesmith.bvandrc.workers.dev/?items=git-commit:370,git-pull-request:264&iconSide=right)

```
https://badgesmith.bvandrc.workers.dev/?items=git-commit:370,git-pull-request:264&iconSide=right
```

**Light pill, dark text**

[![Light pill, dark text](https://badgesmith.bvandrc.workers.dev/?items=clock:2h,calendar:Nov%202026&color=f6f8fa&textColor=1f2328&iconColor=59636e&radius=6)](https://badgesmith.bvandrc.workers.dev/?items=clock:2h,calendar:Nov%202026&color=f6f8fa&textColor=1f2328&iconColor=59636e&radius=6)

```
https://badgesmith.bvandrc.workers.dev/?items=clock:2h,calendar:Nov%202026&color=f6f8fa&textColor=1f2328&iconColor=59636e&radius=6
```

**No background — reads as a link**

[![No background — reads as a link](https://badgesmith.bvandrc.workers.dev/?items=book:docs&bold=true&underline=true&color=none&textColor=0969da&iconColor=0969da&iconScale=0.7)](https://badgesmith.bvandrc.workers.dev/?items=book:docs&bold=true&underline=true&color=none&textColor=0969da&iconColor=0969da&iconScale=0.7)

```
https://badgesmith.bvandrc.workers.dev/?items=book:docs&bold=true&underline=true&color=none&textColor=0969da&iconColor=0969da&iconScale=0.7
```

**No background, compact, legible on light and dark themes**

[![No background, compact, legible on light and dark themes](https://badgesmith.bvandrc.workers.dev/?items=git-commit:547,git-pull-request:0&color=none&iconColor=6E7681&textColor=6E7681&height=14&padY=0)](https://badgesmith.bvandrc.workers.dev/?items=git-commit:547,git-pull-request:0&color=none&iconColor=6E7681&textColor=6E7681&height=14&padY=0)

```
https://badgesmith.bvandrc.workers.dev/?items=git-commit:547,git-pull-request:0&color=none&iconColor=6E7681&textColor=6E7681&height=14&padY=0
```

In a README, use markdown or an `<img>` tag — the latter lets you align it:

```md
![commits and pull requests](https://badgesmith.bvandrc.workers.dev/github?repo=owner/name)
```

```html
<img src="https://badgesmith.bvandrc.workers.dev/github?repo=owner/name" align="right" alt="commits and pull requests">
```

## Why this exists

shields.io supports exactly **one** logo per badge, and hard-codes custom SVG logos to a 14×14 box (`DEFAULT_LOGO_HEIGHT`; the aspect-preserving `logoSize=auto` path only runs for named simple-icons). The PR that would have lifted that, [badges/shields#11093](https://github.com/badges/shields/pull/11093), was closed unmerged.

So several icons mean several images, and a row of images is not one badge. They size independently, wrap independently, load and fail independently, and the gap between them belongs to whatever is rendering them rather than to you. One request returning one SVG gives you a single element to place, with the spacing settled where the badge is drawn.

That last point bites hardest wherever the host adds spacing you can't override. A GitHub README is one such place: its markdown CSS applies `padding-left: 20px` to every `img[align=right]`, and since only `<img>` and `<table>` float via the `align` attribute, two right-aligned badges can never sit flush there.

## Routes

### `GET /` — the usage page

Opening the root with no query returns a short HTML page: three live examples, each rendered by the worker serving it. Any query at all means a badge was intended, so a malformed one still gets a 400 rather than the page.

### `GET /?items=…` — explicit values

| param | default | notes |
| --- | --- | --- |
| `items` | _required_ | comma-separated `icon:value` pairs, up to 6; a value alone draws without an icon; value 1–32 chars |
| `color` | `2f363d` | pill background, 3- or 6-digit hex, no `#`, or `none` for no background |
| `iconColor` | `8B949E` |  |
| `textColor` | `fff` |  |
| `height` | `20` | 12–64; the box the contents are centred in |
| `padY` | 15% of `height` | 0–32; space above and below the contents, under half of `height` |
| `iconSide` | `left` | `left` or `right`; which side of its value each icon sits on |
| `iconScale` | `1` | 0.25–1; how large each icon is against its value |
| `bold` | `false` | `true` or `false`; draws every value in the bold face |
| `underline` | `false` | `true` or `false`; draws a line under every value |
| `radius` | `0` | corner radius; `0` matches shields' flat-square |

`bold=true` draws the values in Verdana's bold face, measured against that face's own metrics — its glyphs advance further than the regular one's, so measuring bold text against regular widths would leave it wider than the pill drawn for it.

`underline=true` draws a line under every value, which costs no width: an underline does not change what a glyph advances by, so the measured text stays the right size. It is a presentation attribute rather than CSS, so GitHub's image proxy serves it intact.

`iconScale` draws the icons smaller against their values. At 1 an icon fills the height the contents are given, which is taller than the text beside it; lower brings it nearer the text's own size, and the badge narrows by what the icon gives up. It stops at 1 because the icon already fills that height — a larger one would run past the badge and be cut off by its edges.

`iconSide=right` draws each icon after its own value instead of before it. The badge is the same width either way — only the order within a pair changes — and the `aria-label` still reads `370 git-commit`, since it says what the badge holds rather than how it is arranged.

Contents scale to the room `padY` leaves them, not to `height`, so trimming the padding grows the icons and text rather than cropping the pill. `height=14&padY=0` renders the default 11px text in a 14px box — 14px being as short as it goes at that text size, since the icon is the taller of the two. Going shorter still is allowed and shrinks the text with it.

`color=none` draws no background, so the badge sits on whatever is behind it. Nothing then separates the badge from the page, so `iconColor` and `textColor` have to carry their own contrast — a README shown on both GitHub themes wants a mid grey such as `6E7681` rather than the default white text, which disappears on a light background.

Values live in the URL, so a changed value is a different URL — the response is cached for a week and can never go stale.

### `GET /<provider>` — live values

A **provider** looks values up itself, for a fixed set of icons, so the URL holds no numbers — which is what keeps a generated README reproducible while the numbers stay current. Cached an hour; a lookup that fails renders `?` with a 5-minute cache rather than breaking the image. The style params above apply here too.

#### `github`

`GET /github?repo=owner/name` renders `git-commit` and `git-pull-request` with the repo's total commits and pull requests. Set a token to raise the rate limit (Cloudflare egress IPs are shared, so the unauthenticated 60/hour is easy to exhaust):

```sh
wrangler secret put GITHUB_TOKEN
```

Private repos aren't readable this way — pass their numbers to `/` instead.

### Icons

Any [octicon](https://primer.style/foundations/icons) slug works — all 408 of them, square or not.

Internals — why the icon registry and the width table are generated, the constraints the renderer works under, and the development commands — are in [docs/internals.md](./docs/internals.md).
