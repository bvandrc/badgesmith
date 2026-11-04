## Project

A Cloudflare Worker that renders several icon/value pairs as a **single** SVG badge, because shields.io allows only one logo per badge. Served on demand; every value lives in the URL.

- **Stack**: TypeScript on workerd, run and deployed with `wrangler`. No framework and no bundler config — `wrangler.jsonc` points `main` at `src/index.ts`. Tests are `node:test` under `node --experimental-strip-types`, so there is no test runner to install. Biome for lint/format.
- **Layout**: `src/index.ts` is the Worker entry — routing, responses, and the one `try`/`catch` that turns a `BadRequestError` into a 400. `src/query-params.ts` parses the query string, `src/render.ts` is the pure renderer, `src/usage.ts` is the landing page served on a bare root, and `src/icons.ts` / `src/text.ts` are the lookups it uses. `scripts/` holds the generators.
- **Generated files**: `src/generated/` and the SVGs under `src/__fixtures__/` (plus `sample.svg`) are **generated — never edit them by hand**. `pnpm gen:all` rewrites all of them and CI fails when the committed copies differ. `biome.jsonc` excludes `src/generated/**` for the same reason, so a new generator writing there needs no biome change.
- **The renderer must stay pure**: no fetches, no external references, no `fs`. GitHub proxies README images through camo, which enforces an exact `image/svg+xml` content type, serves the result under `default-src 'none'`, and times out at 10s. The icon paths and the Verdana width table are generated at build time precisely so the runtime needs neither. See [docs/internals.md](./docs/internals.md).
- **`zod/mini`, named imports only**: `import { object as zObject } from 'zod/mini'` costs ~9KB gzipped; `import { z } from 'zod/mini'` costs 85KB, because `z` is a 257-member object that defeats tree shaking, and the full `zod` namespace costs 93KB — more than the entire worker. Biome's `noNamespaceImport` catches `import * as z` but **not** `import { z }`, so this one is on you.
- **Two tsconfigs**: `@types/node` and `@cloudflare/workers-types` redeclare the same web globals and cannot share a program, so `tsconfig.json` covers `src` with workers types and excludes tests, while `tsconfig.test.json` covers the tests and `scripts` with node types. `pnpm ts:check` runs both.
- **No path aliases**: the tests execute on bare node, which does not read `tsconfig` `paths` — an aliased import fails at runtime with `ERR_MODULE_NOT_FOUND`. A `__tests__` file reaches its subject with `../`, as the testing conventions ask, and everything else relatively too.
- **Workflows**: `ci.yml` is the gate — biome, both `tsc` passes, the tests, `bvandrc/lint-package-json`, and a step that runs `pnpm gen:all` and fails on any drift. `sync-conventions.yml` pulls `conventions/` from the shared conventions repo.

## Docs

- `README.md` — user-facing only: what it does, the routes, the params, the icon slugs. Keep implementation rationale out of it.
- @docs/internals.md — why it is built this way: the generated registry and width table, the runtime dependency budget, camo's constraints, and the fixture strategy. New rationale goes here.

## Code conventions

Conventions live outside this file, synced from https://github.com/bvandrc/bvandrc-conventions — follow all of them:

- @conventions/typescript.md — language-level TypeScript/JavaScript rules
- @conventions/ts-testing-all.md — practice for any TypeScript test suite
- @conventions/ts-unit-testing.md — unit test layout and placement
- @conventions/all.md — practice for every repo: branches, formatting, writing, PR reviews

`react.md`, `playwright.md`, and `npm-publishing.md` exist upstream but are deliberately not synced here: there is no React, no Playwright suite, and this is a Worker rather than a published package.

## Commands

- `pnpm dev` — run the worker locally on workerd. `pnpm deploy` — publish it.
- `pnpm gen:all` — rewrite every generated file. Run it after changing the renderer, the icon source, or the width source, and commit the result; CI checks it is current. The individual `gen:icons`, `gen:widths`, and `gen:svg` exist for when you know which one you need.
- `pnpm check` — the full gate: Biome plus both `tsc` projects plus the tests. Run before every commit; it's what CI runs. `pnpm format` — Biome check/fix.

## Conventions

- **Package manager**: pnpm only — never `npm install`, which writes a competing `package-lock.json`.
- **pnpm version**: use the latest. pnpm 12 enforces `minimumReleaseAge` (24h by default); pnpm 10 silently ignores it and resolves a lockfile that CI then rejects.
- **Convention files**: `conventions/` is synced from https://github.com/bvandrc/bvandrc-conventions and overwritten on every sync. Edit a rule upstream, never in that directory.
