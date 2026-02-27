import { defineConfig, type Options } from 'tsup';

const commonOptions: Options = {
  sourcemap: true,
  clean: true,
  dts: true,
  splitting: false,
  format: ['cjs', 'esm'],
};

export default defineConfig([
  // Core package - no external deps
  {
    ...commonOptions,
    entry: ['packages/core/src/index.ts'],
    outDir: 'packages/core/dist',
    platform: 'node',
    external: [],
  },
  // CLI package - external for lokal-core
  {
    ...commonOptions,
    entry: ['packages/cli/src/index.ts'],
    outDir: 'packages/cli/dist',
    platform: 'node',
    external: ['@devcoda/lokal-core', 'lokal-core', 'chalk', 'commander', 'ora'],
  },
  // React package - external for lokal-core
  {
    ...commonOptions,
    entry: ['packages/react/src/index.ts'],
    outDir: 'packages/react/dist',
    platform: 'browser',
    external: ['@devcoda/lokal-core', 'lokal-core', 'react'],
  },
]);
