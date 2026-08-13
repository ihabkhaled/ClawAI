import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';
import unicorn from 'eslint-plugin-unicorn';
import importX from 'eslint-plugin-import-x';

// ── Shared no-restricted-syntax selectors ────────────────────────────────────
const banInlineInterface = {
  selector: 'TSInterfaceDeclaration',
  message: 'Extract interfaces to a dedicated types/ or interfaces/ file.',
};
const banInlineTypeAlias = {
  selector: 'TSTypeAliasDeclaration',
  message: 'Extract type aliases to a dedicated types/ file.',
};
const banInlineEnum = {
  selector: 'TSEnumDeclaration',
  message: 'Extract enums to common/enums/ directory.',
};
const banTopLevelConst = {
  selector: 'Program > VariableDeclaration[kind="const"] > VariableDeclarator[init.type!="NewExpression"]',
  message: 'Extract top-level constants to a dedicated constants/ file.',
};
const banExportedTopLevelConst = {
  selector: 'Program > ExportNamedDeclaration > VariableDeclaration[kind="const"] > VariableDeclarator[init.type!="NewExpression"][init.type!="ArrowFunctionExpression"]',
  message: 'Extract exported constants to a dedicated constants/ file.',
};
const banFunctionDeclaration = {
  selector: 'FunctionDeclaration',
  message: 'Extract standalone functions to a dedicated utilities/ file.',
};
const banStringLiteralUnion = {
  selector: 'TSUnionType > TSLiteralType > Literal[value=/^[a-zA-Z]/]',
  message: 'Use an enum from common/enums/ instead of string literal unions.',
};

const logicFileRestrictions = [
  banInlineInterface,
  banInlineTypeAlias,
  banInlineEnum,
  banTopLevelConst,
  banExportedTopLevelConst,
  banFunctionDeclaration,
  banStringLiteralUnion,
];

export default tseslint.config(
  // ── Global ignores ─────────────────────────────────────────────────────────
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'prisma/**',
      'src/generated/**',
      '*.config.*',
      '*.mjs',
      '*.cjs',
      '*.js',
      'jest.config.ts',
    ],
  },

  // ── Base configs ───────────────────────────────────────────────────────────
  eslint.configs.recommended,
  ...tseslint.configs.strict,

  // ── Main TypeScript rules ──────────────────────────────────────────────────
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    plugins: {
      security,
      unicorn,
      'import-x': importX,
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // ── TypeScript strict ────────────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-shadow': 'warn',
      '@typescript-eslint/default-param-last': 'error',
      '@typescript-eslint/no-useless-empty-export': 'error',
      '@typescript-eslint/no-loop-func': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-extraneous-class': 'off',

      // ── Core ESLint ──────────────────────────────────────────────────────
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'prefer-template': 'error',
      'no-param-reassign': ['error', { props: false }],
      'no-return-await': 'off',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      'no-shadow': 'off',
      'default-param-last': 'off',
      'no-loop-func': 'off',

      // ── Security ─────────────────────────────────────────────────────────
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-pseudoRandomBytes': 'warn',
      'security/detect-unsafe-regex': 'warn',

      // ── Unicorn ──────────────────────────────────────────────────────────
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/no-array-for-each': 'warn',
      'unicorn/no-useless-undefined': 'warn',
      'unicorn/prefer-ternary': 'warn',
      'unicorn/no-nested-ternary': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-array-find': 'warn',
      'unicorn/prefer-array-some': 'warn',
      'unicorn/prefer-includes': 'warn',
      'unicorn/prefer-number-properties': 'warn',
      'unicorn/no-lonely-if': 'warn',
      'unicorn/no-array-push-push': 'warn',
      'unicorn/prefer-spread': 'warn',
      'unicorn/prefer-string-replace-all': 'warn',
      'unicorn/prefer-at': 'warn',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-null': 'off',
      'unicorn/filename-case': 'off',

      // ── Import-x ────────────────────────────────────────────────────────
      'import-x/no-duplicates': ['error', { 'prefer-inline': true }],
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-mutable-exports': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-cycle': 'off',
      'import-x/no-useless-path-segments': 'error',

      // ── Sort imports ─────────────────────────────────────────────────────
      'sort-imports': [
        'warn',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
        },
      ],
    },
  },

  // ── Service files: logic restrictions + size limits ────────────────────────
  {
    files: ['src/**/*.service.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...logicFileRestrictions],
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 10],
    },
  },

  // ── Controller files: logic restrictions + no try/catch/throw ──────────────
  {
    files: ['src/**/*.controller.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...logicFileRestrictions,
        {
          selector: 'TryStatement',
          message: 'Controllers must not use try/catch. Let exception filters handle errors.',
        },
        {
          selector: 'ThrowStatement',
          message: 'Controllers must not throw. Delegate to services.',
        },
      ],
    },
  },

  // ── Repository files: logic restrictions + no throw ────────────────────────
  {
    files: ['src/**/*.repository.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...logicFileRestrictions,
        {
          selector: 'ThrowStatement',
          message:
            'Repositories must not throw business exceptions. Return data and let services decide.',
        },
      ],
    },
  },

  // ── Module, guard, interceptor, filter, pipe files ─────────────────────────
  {
    files: [
      'src/**/*.module.ts',
      'src/**/*.guard.ts',
      'src/**/*.interceptor.ts',
      'src/**/*.filter.ts',
      'src/**/*.pipe.ts',
      'src/**/*.adapter.ts',
    ],
    rules: {
      'no-restricted-syntax': ['error', ...logicFileRestrictions],
    },
  },

  // ── Manager files: logic restrictions + size limits ─────────────────────────
  {
    files: ['src/**/*.manager.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...logicFileRestrictions],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 15],
    },
  },

  // ── Utility files: no inline types/consts (only exported functions) ────────
  {
    files: ['src/**/*.utility.ts', 'src/**/*.utilities.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        banInlineInterface,
        banInlineTypeAlias,
        banInlineEnum,
        {
          selector: 'Program > VariableDeclaration[kind="const"] > VariableDeclarator[init.type!="NewExpression"]',
          message: 'Extract top-level constants to a dedicated constants/ file. Logger instances (new Logger) are allowed.',
        },
        {
          selector: 'Program > ExportNamedDeclaration > VariableDeclaration[kind="const"] > VariableDeclarator[init.type!="NewExpression"]',
          message: 'Extract exported constants to a dedicated constants/ file. Logger instances are allowed.',
        },
      ],
    },
  },

  // ── Test file overrides ────────────────────────────────────────────────────
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-restricted-syntax': 'off',
      'max-lines-per-function': 'off',
      'security/detect-object-injection': 'off',
      'security/detect-possible-timing-attacks': 'off',
      'import-x/first': 'off',
    },
  },
);
