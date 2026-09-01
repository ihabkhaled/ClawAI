import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: [
    '<rootDir>/src/infrastructure/redis/__tests__/*runtime-v2*.spec.ts',
    '<rootDir>/src/infrastructure/redis/__tests__/redis-client.adapter.spec.ts',
    '<rootDir>/src/infrastructure/redis/__tests__/redis.service.spec.ts',
    '<rootDir>/src/modules/chat-messages/dto/__tests__/runtime-v2.dto.spec.ts',
    '<rootDir>/src/modules/chat-messages/repositories/__tests__/runtime-v2.store.spec.ts',
    '<rootDir>/src/modules/chat-messages/repositories/__tests__/runtime-v2.store.behavior.spec.ts',
    '<rootDir>/src/modules/chat-messages/utilities/__tests__/runtime-v2.utilities.spec.ts',
    '<rootDir>/src/modules/chat-messages/utilities/__tests__/runtime-v2-reply.utility.spec.ts',
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/infrastructure/redis/redis-client.adapter.ts',
    'src/infrastructure/redis/redis.service.ts',
    'src/modules/chat-messages/dto/runtime-v2.dto.ts',
    'src/modules/chat-messages/repositories/runtime-v2.store.ts',
    'src/modules/chat-messages/utilities/runtime-v2-identity.utility.ts',
    'src/modules/chat-messages/utilities/runtime-v2-key.utility.ts',
    'src/modules/chat-messages/utilities/runtime-v2-reply.utility.ts',
  ],
  coverageReporters: ['text', 'text-summary'],
  coverageThreshold: {
    global: { branches: 95, functions: 95, lines: 95, statements: 95 },
    'src/infrastructure/redis/**/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    'src/modules/chat-messages/dto/runtime-v2.dto.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    'src/modules/chat-messages/repositories/runtime-v2.store.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    'src/modules/chat-messages/utilities/runtime-v2-*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  transform: {
    '^.+\\.ts$': 'ts-jest',
    // @nestjs/* is ESM-only as of v12; Jest itself stays CommonJS (see
    // babel.config.cjs), so its compiled JS is transformed back to CJS here.
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(@nestjs)/)'],
  // @nestjs/common v12 no longer pulls this in as a side effect of its own
  // import chain, so decorator metadata (Reflect.getOwnMetadata) is undefined
  // unless a test file happens to import something that loads it first.
  setupFiles: ['reflect-metadata'],
  testEnvironment: 'node',
};

export default config;
