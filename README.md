# multi-icon-badge

Renders several icon/value pairs as a **single** SVG badge, on demand.

```
https://multi-icon-badge.<subdomain>.workers.dev/?items=git-commit:370,git-pull-request:264
```

<img src="./sample.svg" alt="370 commits, 264 pull requests" height="18">

## Why this exists

shields.io supports exactly **one** logo per badge, and hard-codes custom SVG logos to a 14×14 box (`DEFAULT_LOGO_HEIGHT`; the aspect-preserving `logoSize=auto` path only runs for named simple-icons). The PR that would have lifted that, [badges/shields#11093](https://github.com/badges/shields/pull/11093), was closed unmerged.

Two icons therefore mean two images — and in a GitHub README that forces a visible gap, because GitHub's markdown CSS applies `padding-left: 20px` to every `img[align=right]`:

```css
.markdown-body img[align="right"] {
  padding-left: 20px;
}
```

Only `<img>` and `<table>` float via the `align` attribute (on a `<div>` it maps to `text-align`), so two right-aligned badges can never sit flush. One image is the only way to have several icons flush _and_ floated.

## Routes

### `GET /` — explicit values

| param | default | notes |
| --- | --- | --- |
| `items` | _required_ | comma-separated `icon:value` pairs, up to 6; value 1–12 chars |
| `color` | `2f363d` | pill background, 3- or 6-digit hex, no `#` |
| `iconColor` | `8B949E` |  |
| `textColor` | `fff` |  |
| `height` | `20` | 12–64; everything scales from it |
| `radius` | `0` | corner radius; `0` matches shields' flat-square |

Values live in the URL, so a changed value is a different URL — the response is cached for a week and can never go stale.

### Icons

Any [octicon](https://primer.style/foundations/icons) slug works — all 408 of them, square or not.

`@primer/octicons` is a _dev_ dependency rather than a runtime one: its object carries a parsed AST, keywords, and up to five size variants per icon — 1.1MB to serve a path string, none of which a bundler can tree-shake. `pnpm gen:icons` reduces it to each icon's smallest variant and writes `src/generated/icons.ts`, which is 56KB gzipped for the whole set. Run it after bumping the dependency; CI fails if the registry has drifted.

There are two runtime dependencies. `zod/mini` validates the style params. The entry point and the named imports both matter: for this exact schema, `import * as z from 'zod'` measured 93KB gzipped — more than the entire worker — because the namespace barrel defeats tree shaking and drags in a compiler and two JSON-schema processors. `zod/mini` with named imports costs ~9KB gzipped instead. `es-toolkit` supplies `sumBy`, for 113 bytes gzipped.

## Constraints worth knowing before changing the renderer

GitHub proxies every README image through camo, which imposes three things:

- The response **must** be `Content-Type: image/svg+xml` — camo sends `X-Content-Type-Options: nosniff`, so a wrong type renders nothing.
- Camo serves the SVG under `Content-Security-Policy: default-src 'none'; img-src data:; style-src 'unsafe-inline'`. No external fonts, images, or scripts; `<foreignObject>` is unreliable. A test asserts the output references nothing external.
- Camo's socket timeout is 10s and its size limit 5MB, so the handler stays pure computation.

Because SVG can't measure text and no font can be loaded, the pill is sized from a table of Verdana advance widths. `pnpm gen:widths` generates it from [anafanafo](https://github.com/metabolize/anafanafo) — shields.io's own font metrics — so the numbers are measured rather than estimated. anafanafo does run in a Worker, but it ships four complete font tables, around 900KB of JSON covering each font's whole character range, and importing it takes the bundle from 68KB gzipped to 283KB in order to answer for 95 characters at one size. So it stays a devDependency and the widths are generated, exactly as the icons are. A character outside printable ASCII is measured as the widest one in the table, so text can never overflow the pill. CI fails if the table has drifted.

`render.test.ts` compares the renderer against the fixture SVGs in `src/__fixtures__/` and against `sample.svg`, one test each, with the inputs they were rendered from in `src/__fixtures__/inputs.ts` so the generator and the tests cannot disagree about what is pinned. An intended change to the output is recorded by running `pnpm gen:svg` and reading the diff. CI runs `pnpm gen:all` and fails on any difference.

## Development

```sh
pnpm install
pnpm dev         # local worker
pnpm test        # node:test, no test framework needed
pnpm gen:all     # every generator below, which is what CI checks
pnpm gen:icons   # src/generated/icons.ts, from @primer/octicons
pnpm gen:widths  # src/generated/text-widths.ts, from anafanafo
pnpm gen:svg     # sample.svg and the test fixtures, from the renderer
pnpm check       # biome + tsc + tests
pnpm deploy
```
