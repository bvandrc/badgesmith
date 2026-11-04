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

## Deploying

`deploy.yml` triggers on CI completing for `main`, so merging is what ships and the checks are not run twice. It deploys only when that run concluded `success` — `workflow_run` fires whatever the conclusion was — and checks out `github.event.workflow_run.head_sha`, because a `workflow_run` job otherwise gets the default branch's tip rather than the commit CI actually passed.

It can also be dispatched by hand, to redeploy without a commit or to deploy another ref. A dispatch carries no `workflow_run` context, so the job's condition lets it through and it checks out the ref it was given — which does mean a hand-run deploy is only as checked as the ref you point it at.

Because `workflow_run` only fires for a workflow file already on the default branch, this cannot be exercised from a pull request: the first real run is after it merges.

Deploys are serialized by a `deploy` concurrency group that does not cancel in progress. Interrupting wrangler mid-upload is not safe, and queueing means two merges in quick succession both run, leaving the later one live.

It needs a `CLOUDFLARE_API_TOKEN` repository secret: a Cloudflare API token with the **Edit Cloudflare Workers** template, not an account API key. `wrangler` reads it from the environment, so the step is the same `pnpm deploy` you would run locally. Add `CLOUDFLARE_ACCOUNT_ID` too if the token can see more than one account, which is the error wrangler gives if so.

CI's **E2E on workerd** job runs the same `scripts/e2e.ts` against `wrangler dev` on every pull request. The unit tests exercise the renderer on node; this exercises the whole route on workerd, the engine Cloudflare itself runs, so it covers what node cannot — URL parsing, the exact content type camo demands, the cache lifetimes, and the error paths. It needs no credentials, so it works on a fork exactly as it does here, and it waits for the server with a bounded loop that fails loudly rather than hanging if `wrangler dev` never comes up.

A preview deployment per pull request would add little over this: `wrangler dev` is the same workerd, so all a preview would additionally prove is that Cloudflare's own front end and the upload itself work — and a failed upload is already caught by the deploy after merge.

The **E2E** workflow is `workflow_dispatch` only. It asks a _deployed_ worker for each fixture case and compares the bytes, which also covers what a unit test cannot: URL parsing, the exact content type camo demands, and the error paths. It defaults to the deployment named in `scripts/e2e.ts` — committed rather than held in a repository variable, since it is a public URL that is already an image source wherever a badge is used, and a variable would be a setup step no clone can see it needs. The `base_url` input overrides it per run, and `BASE_URL=http://localhost:8787 pnpm e2e` runs the same checks against `pnpm dev`.

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
pnpm e2e         # hit a running worker: BASE_URL=http://localhost:8787 pnpm e2e
pnpm deploy
```
