import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cvm: 'src/bin/cvm.ts',
    'version-manager': 'src/lib/version-manager.ts',
    'plugin-loader': 'src/lib/plugin-loader.ts',
    'plugins/benchmark': 'src/plugins/benchmark.ts',
  },
  format: ['cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  target: 'node14',
  shims: true,
  // Bundle asciichart into the plugin so it works standalone
  noExternal: ['asciichart'],
});
