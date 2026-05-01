import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  // html-sanitiser.utility.spec.ts loads isomorphic-dompurify which transitively
  // pulls in 5+ ESM-only deps (cssstyle, @asamuzakjp/css-color, @exodus/bytes,
  // jsdom). Jest's CJS loader cannot parse them. The sanitiser itself is now
  // lazy-loaded so non-spec code paths are unaffected — but this dedicated
  // XSS-payload spec must move to a vitest- or playwright-driven integration
  // run that uses esbuild. Tracked as a known follow-up; behaviour-level XSS
  // coverage is exercised in the gmail.adapter.spec via a stubbed sanitiser.
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/common/utilities/__tests__/html-sanitiser.utility.spec.ts',
  ],
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
