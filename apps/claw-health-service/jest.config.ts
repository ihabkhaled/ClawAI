import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/*.type.ts',
    '!src/**/*.types.ts',
    '!src/**/*.constants.ts',
    '!src/**/*.enum.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: './coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 92,
      lines: 92,
      statements: 92,
    },
  },
  testEnvironment: 'node',
  testTimeout: 30_000,
  moduleNameMapper: {
    '@app/(.*)': '<rootDir>/src/app/$1',
    '@common/(.*)': '<rootDir>/src/common/$1',
    '@modules/(.*)': '<rootDir>/src/modules/$1',
  },
};

export default config;
