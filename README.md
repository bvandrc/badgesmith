# multi-icon-badge

Renders several icon/value pairs as a **single** SVG badge, on demand.

```
https://multi-icon-badge.<subdomain>.workers.dev/?items=git-commit:370,git-pull-request:264
```

<img src="./sample.svg" alt="370 commits, 264 pull requests" height="18">

## Why this exists

shields.io supports exactly **one** logo per badge, and hard-codes custom SVG logos to a 14×14 box (`DEFAULT_LOGO_HEIGHT`; the aspect-preserving `logoSize=auto` path only runs for named simple-icons). The PR that would have lifted that, [badges/shields#11093](https://github.com/badges/shields/pull/11093), was closed unmerged.

So several icons mean several images, and a row of images is not one badge. They size independently, wrap independently, load and fail independently, and the gap between them belongs to whatever is rendering them rather than to you. One request returning one SVG gives you a single element to place, with the spacing settled where the badge is drawn.

That last point bites hardest wherever the host adds spacing you can't override. A GitHub README is one such place: its markdown CSS applies `padding-left: 20px` to every `img[align=right]`, and since only `<img>` and `<table>` float via the `align` attribute, two right-aligned badges can never sit flush there.

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

Internals — why the icon registry and the width table are generated, the constraints the renderer works under, and the development commands — are in [docs/internals.md](./docs/internals.md).
