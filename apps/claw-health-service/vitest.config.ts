import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Vitest for a NestJS service.
 *
 * The swc plugin is not optional. Vitest transforms with esbuild by default,
 * and esbuild does not emit decorator METADATA — so `Test.createTestingModule`
 * resolves every constructor parameter to `undefined` and dependency injection
 * silently hands back empty objects. swc emits it, which is what makes Nest's
 * container work under Vitest at all.
 *
 * `globals: true` keeps describe/it/expect available without an import in all
 * ~800 migrated specs; only jest.* -> vi.* had to change.
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
    // Jest ran with rootDir '.' and a bare testRegex, so it also picked up
    // specs OUTSIDE src/ — prisma/seeders/__tests__ being the case that caught
    // this. Narrowing to src/** silently dropped them, which is the worst way
    // for a migration to lose coverage: green, and smaller.
    include: ['**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    // Nest reads decorator metadata through reflect-metadata's global shim;
    // without this the polyfill is only present if some import happens to pull
    // it in first, which is exactly the kind of order-dependent flake the old
    // Jest setupFiles entry existed to prevent.
    setupFiles: ['reflect-metadata'],
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.module.ts',
        'src/main.ts',
        'src/**/*.type.ts',
        'src/**/*.types.ts',
        'src/**/*.constants.ts',
        'src/**/*.enum.ts',
        'src/**/index.ts',
      ],
      thresholds: { branches: 80, functions: 92, lines: 92, statements: 92 },
    },
  },
  resolve: {
    alias: {
      '@app': new URL('./src/app', import.meta.url).pathname,
      '@common': new URL('./src/common', import.meta.url).pathname,
      '@modules': new URL('./src/modules', import.meta.url).pathname,
    },
  },
});
