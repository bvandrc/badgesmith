# Internals

Why this worker is built the way it is, and what to know before changing it. For what it does and how to call it, see [the README](../README.md).

## The icon registry is generated

`@primer/octicons` is a _dev_ dependency rather than a runtime one: its object carries a parsed AST, keywords, and up to five size variants per icon — 1.1MB to serve a path string, none of which a bundler can tree-shake. `pnpm gen:icons` reduces it to each icon's smallest variant and writes `src/generated/icons.ts`, which is 56KB gzipped for the whole set. Run it after bumping the dependency; CI fails if the registry has drifted.

## Runtime dependencies

The Worker uses two libraries at runtime. `zod/mini` validates the style params. The entry point and the named imports both matter: for this exact schema, `import * as z from 'zod'` measured 93KB gzipped — more than the entire worker — because the namespace barrel defeats tree shaking and drags in a compiler and two JSON-schema processors. `zod/mini` with named imports costs ~9KB gzipped instead. `es-toolkit` supplies `sumBy`, for 113 bytes gzipped.

Both are `devDependencies`, though. Wrangler bundles whatever the Worker imports whichever list it comes from, so for the Worker the split means nothing; `dependencies` is the npm package's install list, and the package needs neither. It does not parse query strings, so it has no use for `zod`, and `tsdown` inlines the two `es-toolkit` functions it does use rather than having a consumer install the whole library for them.

## The npm package

The renderer is published to npm as `badgesmith`, built by `tsdown` from `src/library.ts` into `dist/`. That entry is the package's public API, and semver follows it: the renderer, the item and style types, and `hasIcon`. The Worker, the query parser, and the providers stay out. A caller who needs the Worker's limits has the Worker.

Because a package caller reaches `renderBadge` without the query parser in front of it, the renderer escapes the colours it writes into attributes rather than trusting them to be hex. The bounds on sizes and counts are still only the parser's: a caller passing input it does not control applies its own.

The bundle carries the whole icon registry, since `renderBadge` looks icons up by slug at runtime and a bundler cannot know which slugs will be asked for. `LICENSE` carries the Octicons MIT notice and the Simple Icons terms, because the package redistributes their paths.

Releasing follows [the npm publishing conventions](../conventions/npm-publishing.md): bump `version`, merge, and publish a GitHub release tagged `v<version>`. `release.yml` stages it through trusted publishing with provenance, and it goes live once approved on npmjs.com. CI's **Package builds** step builds and packs it on every pull request, so a broken build or a missing file shows up before a release does.

## Providers

The rendering core is generic and does no I/O. A provider is the only part that knows about any particular service: a module in `src/providers/` exporting a list of icons and a `resolve` that reads its own query params, plus an entry in `src/providers/registry.ts`. The route dispatches through the registry by path segment, so adding one needs no change to `index.ts`.

`resolve` returns one value per icon, or null when the lookup could not complete. Null is not an error — the route renders `?` in each slot, so an embedded badge degrades to question marks instead of a broken image, and that response is cached for five minutes: long enough to spare the upstream a hot loop, short enough that the badge recovers on its own. A successful lookup caches for an hour. Values that came in the URL cache for a week, since a change to one of those is a different URL.

Anything a provider reads from the environment goes on `Env` in `src/env.ts`, optional. A deployment configured with nothing still serves every route, so a provider that wants a secret has to cope with its absence rather than refuse to run.

## The README and the landing page are generated

Both come from Preact components in `site/`, and both show the examples in `site/examples.ts`, so a badge added there appears in each and the two cannot drift apart. `pnpm gen:pages` renders them: the README against the deployed worker, since GitHub fetches its images from there, and the landing page with root-relative paths, so each badge on it is rendered by whichever deployment served the page.

The page is rendered at build time into `src/generated/usage-page.ts` rather than by the worker. Preact then stays a devDependency, and the runtime serves a constant string, as it does with the icon registry and the width table. The README is written in the same pass, as markdown with the rendered HTML interpolated, so its prose stays markdown while each badge is a component. CI runs `pnpm gen:all` and fails if either has drifted.

## Constraints worth knowing before changing the renderer

GitHub proxies every README image through camo, which imposes three things:

- The response **must** be `Content-Type: image/svg+xml` — camo sends `X-Content-Type-Options: nosniff`, so a wrong type renders nothing.
- Camo serves the SVG under `Content-Security-Policy: default-src 'none'; img-src data:; style-src 'unsafe-inline'`. No external fonts, images, or scripts; `<foreignObject>` is unreliable. A test asserts the output references nothing external.
- Camo's socket timeout is 10s and its size limit 5MB, so the handler stays pure computation.

Because SVG can't measure text and no font can be loaded, the pill is sized from a table of Verdana advance widths. `pnpm gen:widths` generates it from [anafanafo](https://github.com/metabolize/anafanafo) — shields.io's own font metrics — so the numbers are measured rather than estimated. anafanafo does run in a Worker, but it ships four complete font tables, around 900KB of JSON covering each font's whole character range, and importing it takes the bundle from 68KB gzipped to 283KB in order to answer for 95 characters at one size. So it stays a devDependency and the widths are generated, exactly as the icons are. A character outside printable ASCII is measured as the widest one in the table, so text can never overflow the pill. CI fails if the table has drifted.

`render.test.ts` compares the renderer against the fixture SVGs in `src/__fixtures__/` and against `sample.svg`, one test each, with the inputs they were rendered from in `src/__fixtures__/inputs.ts` so the generator and the tests cannot disagree about what is pinned. An intended change to the output is recorded by running `pnpm gen:svg` and reading the diff. CI runs `pnpm gen:all` and fails on any difference.

## Deploying

`deploy.yml` triggers on CI completing for `main`, so merging is what ships and the checks are not run twice. It deploys only when that run concluded `success` — `workflow_run` fires whatever the conclusion was — and checks out `github.event.workflow_run.head_sha`, because a `workflow_run` job otherwise gets the default branch's tip rather than the commit CI actually passed.

It can also be dispatched by hand, to redeploy without a commit or to deploy another ref. A dispatch carries no `workflow_run` context, so the job's condition lets it through and it checks out the ref it was given — which does mean a hand-run deploy is only as checked as the ref you point it at.

Because `workflow_run` only fires for a workflow file already on the default branch, this cannot be exercised from a pull request: the first real run is after it merges.

Deploys are serialized by a `deploy` concurrency group that does not cancel in progress. Interrupting wrangler mid-upload is not safe, and queueing means two merges in quick succession both run, leaving the later one live.

It needs a `CLOUDFLARE_API_TOKEN` repository secret: a Cloudflare API token with the **Edit Cloudflare Workers** template, not an account API key. `wrangler` reads it from the environment, so the step is the same `pnpm deploy` you would run locally. Add `CLOUDFLARE_ACCOUNT_ID` too if the token can see more than one account, which is the error wrangler gives if so.

CI's **E2E on workerd** job runs the same `scripts/e2e.ts` against `wrangler dev` on every pull request. The unit tests exercise the renderer on node; this exercises the whole route on workerd, the engine Cloudflare itself runs, so it covers what node cannot — URL parsing, the exact content type camo demands, the cache lifetimes, and the error paths. It needs no credentials, so it works on a fork exactly as it does here, and it waits for the server with a bounded loop that fails loudly rather than hanging if `wrangler dev` never comes up.

A preview deployment per pull request would add little over this: `wrangler dev` is the same workerd, so all a preview would additionally prove is that Cloudflare's own front end and the upload itself work — and a failed upload is already caught by the deploy after merge.

The **E2E** workflow runs daily and on demand. It asks a _deployed_ worker for each fixture case and compares the bytes, which also covers what a unit test cannot: URL parsing, the exact content type camo demands, and the error paths. It defaults to the deployment named in `scripts/e2e.ts` — committed rather than held in a repository variable, since it is a public URL that is already an image source wherever a badge is used, and a variable would be a setup step no clone can see it needs. The `base_url` input overrides it per run, and `BASE_URL=http://localhost:8787 pnpm e2e` runs the same checks against `pnpm dev`.

The daily run exists because nothing else looks at the live worker again after its deploy: CI checks a commit on workerd before merge, the deploy ships it, and then no one is watching. It would catch a hand-run deploy from another ref, a runtime change underneath it, or the worker no longer being there — with a day's detection window rather than a week's, since a broken badge is visible in every README embedding it. Note that GitHub disables scheduled workflows in a repository with no activity for 60 days.

## Development

```sh
pnpm install
pnpm dev         # local worker
pnpm test        # node:test, no test framework needed
pnpm gen:all     # every generator below, which is what CI checks
pnpm gen:icons   # src/generated/icons.ts, from @primer/octicons
pnpm gen:widths  # src/generated/text-widths.ts, from anafanafo
pnpm gen:svg     # sample.svg and the test fixtures, from the renderer
pnpm gen:pages   # README.md and src/generated/usage-page.ts, from site/
pnpm check       # biome + tsc, no tests
pnpm e2e         # hit a running worker: BASE_URL=http://localhost:8787 pnpm e2e
pnpm build       # dist/, the npm package, from src/library.ts
pnpm deploy
```
