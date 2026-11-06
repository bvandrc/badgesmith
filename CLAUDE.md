## Project

A Cloudflare Worker that renders several icon/value pairs as a **single** SVG badge, because shields.io allows only one logo per badge. Served on demand; every value lives in the URL. The renderer is also published to npm as `badgesmith`.

- **Stack**: TypeScript on workerd, run and deployed with `wrangler`. No framework and no bundler config — `wrangler.jsonc` points `main` at `src/index.ts`. Tests are `node:test` under `node --experimental-strip-types`, so there is no test runner to install. Biome for lint/format.
- **Layout**: `src/index.ts` is the Worker entry — routing, responses, and the one `try`/`catch` that turns a `BadRequestError` into a 400. `src/query-params.ts` parses the query string into typed values, which `src/badge-options.ts` holds to the badge's limits, `src/render.ts` is the pure renderer, `src/generated/usage-page.ts` is the landing page served on a bare root, and `src/icons.ts` / `src/text.ts` are the lookups it uses. `src/providers/` holds the live-lookup mechanism and `src/env.ts` the bindings it reads. The package's `renderBadge` holds its callers to those same limits. `src/library.ts` is the npm package's entry: a validating `renderBadge` and the types, nothing of the Worker, and what it exports is the package's semver surface. `scripts/` holds the generators. `site/` holds the Preact sources `pnpm gen:pages` renders the README and that landing page from, with the examples both show in `site/examples.ts`.
- **Generated files**: `src/generated/`, `README.md`, and the SVGs under `src/__fixtures__/` (plus `sample.svg`) are **generated — never edit them by hand**. The README's source is `site/readme.tsx`. `pnpm gen:all` rewrites all of them and CI fails when the committed copies differ. `biome.jsonc` excludes `src/generated/**` for the same reason, so a new generator writing there needs no biome change.
- **The renderer must stay pure**: no fetches, no external references, no `fs`. GitHub proxies README images through camo, which enforces an exact `image/svg+xml` content type, serves the result under `default-src 'none'`, and times out at 10s. The icon paths and the Verdana width table are generated at build time precisely so the runtime needs neither. See [docs/internals.md](./docs/internals.md).
- **Providers look values up; the renderer still does not**: a provider is a module in `src/providers/` with an entry in `registry.ts`, keyed by the path it answers at, so adding one needs no change to the route. It fetches, the renderer does not — `resolve` returns the values and `renderBadge` stays pure. A lookup that fails returns null and the route renders `?` rather than erroring, so an embedded badge degrades instead of breaking. Cache lifetimes follow from that: a week for values that live in the URL, an hour for a looked-up one, five minutes for a failed lookup. Each provider adds what it reads to `Env`, optional, so a deployment configured with nothing still serves every route.
- **`caches` and the context are declared structurally in `index.ts`**, not imported from workers-types: `index.test.ts` pulls that module into the node-typed test program, which cannot also load workers types. Both declarations are type-only and erased — widen them rather than reaching for the real types, or the test program stops compiling.
- **`zod/mini`, named imports only**: `import { object as zObject } from 'zod/mini'` costs ~9KB gzipped; `import { z } from 'zod/mini'` costs 85KB, because `z` is a 257-member object that defeats tree shaking, and the full `zod` namespace costs 93KB — more than the entire worker. Biome's `noNamespaceImport` catches `import * as z` but **not** `import { z }`, so this one is on you.
- **`site/` is rendered at build time, never at runtime**: Preact and `preact-render-to-string` are devDependencies, and the worker serves `USAGE_PAGE` as a string. `gen:pages` runs under `tsx` rather than bare node, because node's type stripping does not transform JSX, so nothing under `src/` can import from `site/`.
- **Two tsconfigs**: `@types/node` and `@cloudflare/workers-types` redeclare the same web globals and cannot share a program, so `tsconfig.json` covers `src` with workers types and excludes tests, while `tsconfig.test.json` covers the tests, `scripts`, and `site` with node types and Preact's JSX. `pnpm ts:check` runs both.
- **No path aliases**: the tests execute on bare node, which does not read `tsconfig` `paths` — an aliased import fails at runtime with `ERR_MODULE_NOT_FOUND`. A `__tests__` file reaches its subject with `../`, as the testing conventions ask, and everything else relatively too.
- **Workflows**: `ci.yml` is the gate — biome, both `tsc` passes, the tests, `bvandrc/lint-package-json`, a package build and pack, and a step that runs `pnpm gen:all` and fails on any drift, plus an `E2E on workerd` job that runs `scripts/e2e.ts` against `wrangler dev`, so every pull request is exercised on the runtime it ships to rather than only on node. `release.yml` stages the npm package when a GitHub release is published. `deploy.yml` runs on CI completing green for `main`, so merging ships without the checks running twice; it can also be dispatched by hand against a chosen ref. `sync-conventions.yml` pulls `conventions/` from the shared conventions repo.

## Docs

- `README.md` — user-facing only: what it does, the routes, the params, the icon slugs. Keep implementation rationale out of it. Generated from `site/readme.tsx` — edit that and run `pnpm gen:pages`.
- @docs/internals.md — why it is built this way: the generated registry and width table, the runtime dependency budget, camo's constraints, and the fixture strategy. New rationale goes here.

## Code conventions

Conventions live outside this file, synced from https://github.com/bvandrc/bvandrc-conventions — follow all of them:

- @conventions/typescript.md — language-level TypeScript/JavaScript rules
- @conventions/ts-testing-all.md — practice for any TypeScript test suite
- @conventions/ts-unit-testing.md — unit test layout and placement
- @conventions/react.md — component and JSX rules (the components in `site/` are Preact, same rules apply)
- @conventions/all.md — practice for every repo: branches, formatting, writing, PR reviews
- @conventions/npm-publishing.md — releasing, trusted publishing, and the `package.json` publish fields

## Commands

- `pnpm dev` — run the worker locally on workerd. `pnpm deploy` — publish it.
- `pnpm build` — build the npm package into `dist/`. Never publish by hand: releases go through `release.yml`, per `conventions/npm-publishing.md`.
- `pnpm gen:all` — rewrite every generated file. Run it after changing the renderer, the icon source, the width source, or anything under `site/`, and commit the result; CI checks it is current. The individual `gen:icons`, `gen:widths`, `gen:svg`, and `gen:pages` exist for when you know which one you need.
- `pnpm check` — Biome plus both `tsc` projects. Lint and types only; `pnpm test` is its own script and CI runs it as its own step, so a failure says which of the two broke. Run both before every commit. `pnpm format` — Biome check/fix.

## Conventions

- **Package manager**: pnpm only — never `npm install`, which writes a competing `package-lock.json`.
- **pnpm version**: use the latest. pnpm 12 enforces `minimumReleaseAge` (24h by default); pnpm 10 silently ignores it and resolves a lockfile that CI then rejects.
- **Convention files**: `conventions/` is synced from https://github.com/bvandrc/bvandrc-conventions and overwritten on every sync. Edit a rule upstream, never in that directory.
