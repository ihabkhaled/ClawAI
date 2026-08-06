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
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
};

export default config;
