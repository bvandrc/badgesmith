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

| param       | default    | notes                                                         |
| ----------- | ---------- | ------------------------------------------------------------- |
| `items`     | _required_ | comma-separated `icon:value` pairs, up to 6; value 1–12 chars |
| `color`     | `2f363d`   | pill background, 3- or 6-digit hex, no `#`                    |
| `iconColor` | `8B949E`   |                                                               |
| `textColor` | `fff`      |                                                               |
| `height`    | `20`       | 12–64; everything scales from it                              |
| `radius`    | `0`        | corner radius; `0` matches shields' flat-square               |

Values live in the URL, so a changed value is a different URL — the response is cached for a week and can never go stale.

### `GET /github?repo=owner/name` — live counts

Looks up the repo's total commits and pull requests itself and renders `git-commit` and `git-pull-request`. The URL holds no numbers, which keeps a generated README reproducible while the numbers stay current. Cached an hour; a failed lookup renders `?` with a 5-minute cache rather than breaking the image.

Set a token to raise the rate limit (Cloudflare egress IPs are shared, so the unauthenticated 60/hour is easy to exhaust):

```sh
wrangler secret put GITHUB_TOKEN
```

Private repos aren't readable this way — pass their numbers to `/` instead.

### Icons

`git-commit`, `git-pull-request`, `star`, `issue-opened`, `repo-forked`, `tag`. They're inlined in `src/icons.ts` from [@primer/octicons](https://github.com/primer/octicons) rather than pulled in as a dependency, to keep the bundle small; adding one is a pasted path.

## Constraints worth knowing before changing the renderer

GitHub proxies every README image through camo, which imposes three things:

- The response **must** be `Content-Type: image/svg+xml` — camo sends `X-Content-Type-Options: nosniff`, so a wrong type renders nothing.
- Camo serves the SVG under `Content-Security-Policy: default-src 'none'; img-src data:; style-src 'unsafe-inline'`. No external fonts, images, or scripts; `<foreignObject>` is unreliable. A test asserts the output references nothing external.
- Camo's socket timeout is 10s and its size limit 5MB, so the handler stays pure computation.

Because SVG can't measure text and no font can be loaded, the pill is sized from a Verdana advance-width table in `src/text.ts`. Digits — the overwhelming case — are exact; other characters use a per-case average biased slightly high so text never overflows.

## Development

```sh
pnpm install
pnpm dev      # local worker
pnpm test     # node:test, no test framework needed
pnpm check    # biome + tsc + tests
pnpm deploy
```
