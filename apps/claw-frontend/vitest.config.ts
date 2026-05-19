import path from 'path';

import { defineConfig } from 'vitest/config';

// We intentionally do NOT use @vitejs/plugin-react here. The plugin imports
// `vite/internal` which is no longer exported in the vite version that vitest 4
// bundles, so the plugin fails to load on container startup. Vitest 4 + esbuild
// JSX transform handle React fine for unit/integration tests; we lose Fast Refresh
// (irrelevant in test runs) but gain a working test runner across host + container.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: { branches: 60, functions: 60, lines: 60, statements: 60 },
      exclude: ['src/components/ui/**', 'node_modules', '.next', 'tests'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
