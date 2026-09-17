import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * The Redis-authority e2e lane: *.redis.e2e.ts against a real Redis.
 *
 * Kept as its own config, as it was under Jest, because these are not unit
 * tests — they need a live server and they must run IN BAND. Running them
 * concurrently makes them fight over the same keys, and the failures that
 * produces look like product bugs rather than test interference.
 */
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.redis.e2e.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    setupFiles: ['reflect-metadata'],
    testTimeout: 30_000,
    // In band: one file at a time, one test at a time. The Jest lane used
    // --runInBand for the same reason.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
