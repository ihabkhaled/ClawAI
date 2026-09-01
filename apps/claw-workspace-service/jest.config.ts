import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          isolatedModules: true,
        },
      },
    ],
    // @nestjs/* is ESM-only as of v12 and uses `import.meta`, which ts-jest's
    // CommonJS-targeted transform below cannot rewrite (only Babel has a
    // plugin for that proposal). Matched before the broader `.m?js` rule so
    // @nestjs's own files take this path instead.
    // No path-separator assumption (Windows uses backslashes here, not `/`).
    '@nestjs.*\\.js$': 'babel-jest',
    '^.+\\.m?js$': [
      'ts-jest',
      {
        tsconfig: {
          allowJs: true,
          isolatedModules: true,
          module: 'CommonJS',
        },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:@asamuzakjp|@bramus|@csstools|@exodus|@nestjs|css-tree|entities|lru-cache|parse5|tough-cookie)/)',
  ],
  // @nestjs/common v12 no longer pulls this in as a side effect of its own
  // import chain, so decorator metadata (Reflect.getOwnMetadata) is undefined
  // unless a test file happens to import something that loads it first.
  setupFiles: ['reflect-metadata', '<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
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
