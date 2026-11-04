# Internals

Why this worker is built the way it is, and what to know before changing it. For what it does and how to call it, see [the README](../README.md).

## The icon registry is generated

`@primer/octicons` is a _dev_ dependency rather than a runtime one: its object carries a parsed AST, keywords, and up to five size variants per icon — 1.1MB to serve a path string, none of which a bundler can tree-shake. `pnpm gen:icons` reduces it to each icon's smallest variant and writes `src/generated/icons.ts`, which is 56KB gzipped for the whole set. Run it after bumping the dependency; CI fails if the registry has drifted.

## Runtime dependencies

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
pnpm check       # biome + tsc, no tests
pnpm deploy
```
