import { defineConfig } from 'tsdown'

export default defineConfig({
  // only the renderer ships; the Worker in src/index.ts is deployed, not published
  entry: { index: 'src/library.ts' },
  deps: {
    // the renderer uses two of its functions, about 100 bytes, so they are
    // inlined and the package installs with no dependencies at all
    alwaysBundle: ['es-toolkit'],
  },
  dts: true,
})
