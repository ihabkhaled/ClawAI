import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\.spec\.ts$',
  transform: {
    '^.+\.ts$': 'ts-jest',
    // @nestjs/* is ESM-only as of v12; Jest itself stays CommonJS (see
    // babel.config.cjs), so its compiled JS is transformed back to CJS here.
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(@nestjs)/)'],
  // @nestjs/common v12 no longer pulls this in as a side effect of its own
  // import chain, so decorator metadata (Reflect.getOwnMetadata) is undefined
  // unless a test file happens to import something that loads it first.
  setupFiles: ['reflect-metadata'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.type.ts',
    '!src/**/*.constants.ts',
  ],
  coverageDirectory: './coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testEnvironment: 'node',
  testTimeout: 30_000,
  moduleNameMapper: {
    '@app/(.*)': '<rootDir>/src/app/$1',
    '@common/(.*)': '<rootDir>/src/common/$1',
    '@infrastructure/(.*)': '<rootDir>/src/infrastructure/$1',
    '@modules/(.*)': '<rootDir>/src/modules/$1',
  },
};

export default config;
