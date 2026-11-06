import { defineConfig } from 'tsdown'

export default defineConfig({
  // only the renderer ships; the Worker in src/index.ts is deployed, not published
  entry: { index: 'src/library.ts' },
  deps: {
    // inlined so the package installs with no dependencies at all: the
    // renderer uses two es-toolkit functions, and the validator zod/mini's
    // named imports, about 12KB gzipped against the icon table's ~190KB
    alwaysBundle: ['es-toolkit', /^zod(\/|$)/],
  },
  dts: true,
})
