import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cvm: 'src/bin/cvm.ts',
    'version-manager': 'src/lib/version-manager.ts',
    'plugin-loader': 'src/lib/plugin-loader.ts',
    'plugins/analyzer': 'src/plugins/analyzer.ts',
  },
  format: ['cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  target: 'node14',
  shims: true,
});
