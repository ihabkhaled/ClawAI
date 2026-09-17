import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Runtime V2's security-coverage lane.
 *
 * A narrow file list with a 95% floor, deliberately separate from the
 * service-wide suite: these are the Redis authority, the runtime DTOs and the
 * identity/key utilities — the code where a gap is a security gap, not a
 * missing branch. A service-wide average would hide exactly that.
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
    include: [
      'src/infrastructure/redis/__tests__/*runtime-v2*.spec.ts',
      'src/infrastructure/redis/__tests__/redis-client.adapter.spec.ts',
      'src/infrastructure/redis/__tests__/redis.service.spec.ts',
      'src/modules/chat-messages/dto/__tests__/runtime-v2.dto.spec.ts',
      'src/modules/chat-messages/repositories/__tests__/runtime-v2.store.spec.ts',
      'src/modules/chat-messages/repositories/__tests__/runtime-v2.store.behavior.spec.ts',
      'src/modules/chat-messages/utilities/__tests__/runtime-v2.utilities.spec.ts',
      'src/modules/chat-messages/utilities/__tests__/runtime-v2-reply.utility.spec.ts',
    ],
    setupFiles: ['reflect-metadata'],
    testTimeout: 30_000,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      enabled: true,
      reporter: ['text', 'text-summary'],
      include: [
        'src/infrastructure/redis/redis-client.adapter.ts',
        'src/infrastructure/redis/redis.service.ts',
        'src/modules/chat-messages/dto/runtime-v2.dto.ts',
        'src/modules/chat-messages/repositories/runtime-v2.store.ts',
        'src/modules/chat-messages/utilities/runtime-v2-identity.utility.ts',
        'src/modules/chat-messages/utilities/runtime-v2-key.utility.ts',
        'src/modules/chat-messages/utilities/runtime-v2-reply.utility.ts',
      ],
      thresholds: { branches: 95, functions: 95, lines: 95, statements: 95 },
    },
  },
});
