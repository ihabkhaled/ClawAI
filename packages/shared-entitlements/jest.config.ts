import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
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
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  testTimeout: 30_000,
};

export default config;
