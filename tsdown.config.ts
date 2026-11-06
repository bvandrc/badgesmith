import { defineConfig } from 'tsdown'

export default defineConfig({
  // only the renderer ships; the Worker in src/index.ts is deployed, not published
  entry: { index: 'src/library.ts' },
  // the package keeps es-toolkit as a dependency, so it is left to the
  // consumer's bundler rather than inlined here
  dts: true,
})
