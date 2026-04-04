import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import security from 'eslint-plugin-security';
import unicorn from 'eslint-plugin-unicorn';
import importX from 'eslint-plugin-import-x';

// ─── Shared separation-of-concerns selectors ────────────────────────────────
const banStringLiteralUnion = {
  selector: 'TSUnionType > TSLiteralType',
  message: 'Use an enum from src/enums/ instead of string literal unions.',
};

const banEnumDeclaration = {
  selector: 'TSEnumDeclaration',
  message: 'Define enums in src/enums/ only. Import them where needed.',
};

const banTypeAliasInTsx = {
  selector: 'TSTypeAliasDeclaration',
  message: 'Extract types to src/types/<domain>.types.ts.',
};

const banInterfaceInTsx = {
  selector: 'TSInterfaceDeclaration',
  message: 'Extract interfaces to src/types/<domain>.types.ts.',
};

const banInlineHookFunction = {
  selector: 'FunctionDeclaration[id.name=/^use[A-Z]/]',
  message: 'Extract hooks to src/hooks/useX.ts. TSX files are pure render only.',
};

const banInlineHookArrow = {
  selector:
    'VariableDeclarator[id.name=/^use[A-Z]/] > ArrowFunctionExpression',
  message: 'Extract hooks to src/hooks/useX.ts. TSX files are pure render only.',
};

const banScreamingCaseConst = {
  selector:
    'VariableDeclaration[kind="const"] > VariableDeclarator[id.name=/^[A-Z][A-Z0-9_]+$/]',
  message: 'Extract constants to src/constants/. No SCREAMING_CASE in TSX files.',
};

const banUtilityFunctions = {
  selector:
    'ExportNamedDeclaration > FunctionDeclaration[id.name=/^(format|parse|transform|convert|calculate|validate|sanitize|normalize|serialize|deserialize)/]',
  message: 'Extract utility functions to src/utilities/ or src/lib/.',
};

const banInlineConstInComponent = {
  selector:
    'Program > VariableDeclaration[kind="const"] > VariableDeclarator[init.type!="ArrowFunctionExpression"][init.type!="CallExpression"]',
  message:
    'Module-level const declarations in component files must be extracted to src/constants/. Only component definitions are allowed inline.',
};

const banNonExportedFunctionInComponent = {
  selector:
    'Program > FunctionDeclaration:not([id.name=/^[A-Z]/]):not([id.name=/^use[A-Z]/])',
  message:
    'Non-component helper functions must be extracted to src/utilities/. Only component definitions (PascalCase) are allowed inline.',
};

const banInlineConstInServices = {
  selector:
    'Program > VariableDeclaration[kind="const"] > VariableDeclarator[init.type!="ObjectExpression"][init.type!="CallExpression"][init.type!="ArrowFunctionExpression"]',
  message:
    'Module-level const declarations in hooks/services/stores must be extracted to src/constants/. Only service objects and store definitions are allowed inline.',
};

const banNonExportedFunctionInServices = {
  selector:
    'Program > FunctionDeclaration:not([id.name=/^use[A-Z]/])',
  message:
    'Helper functions in hooks/services/stores must be extracted to src/utilities/.',
};

// ─── Config ──────────────────────────────────────────────────────────────────
export default defineConfig([
  // Global ignores
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    'node_modules/**',
    '*.config.ts',
    '*.config.js',
    '*.config.mjs',
    '*.config.cjs',
    'vitest.config.ts',
    'commitlint.config.cjs',
    'postcss.config.*',
    'tailwind.config.*',
    'next.config.*',
  ]),

  // TypeScript-ESLint recommended (provides parser + plugin + base rules)
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),

  // React recommended (flat config)
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    ...react.configs.flat.recommended,
    settings: {
      react: { version: 'detect' },
    },
  },

  // React JSX runtime (no need to import React in scope)
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    ...react.configs.flat['jsx-runtime'],
  },

  // JSX Accessibility
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    ...jsxA11y.flatConfigs.recommended,
  },

  // React Hooks (legacy plugin — register manually)
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // ─── Base rules for all TS/TSX ──────────────────────────────────────────
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      security,
      unicorn,
      'import-x': importX,
    },
    rules: {
      // ── TypeScript ─────────────────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-empty-interface': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',

      // ── Core JS ────────────────────────────────────────────────────────
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-param-reassign': ['error', { props: false }],
      'no-nested-ternary': 'error',
      curly: ['error', 'all'],
      'no-else-return': 'error',
      'no-return-await': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'no-useless-rename': 'error',
      'no-duplicate-imports': 'off', // handled by import-x

      // ── React ──────────────────────────────────────────────────────────
      'react/jsx-no-target-blank': 'error',
      'react/jsx-boolean-value': ['error', 'never'],
      'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
      'react/self-closing-comp': 'error',
      'react/no-danger': 'error',
      'react/no-array-index-key': 'warn',
      'react/no-unstable-nested-components': 'error',
      'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
      'react/jsx-no-constructed-context-values': 'error',

      // ── Accessibility ──────────────────────────────────────────────────
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',

      // ── Security ───────────────────────────────────────────────────────
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-possible-timing-attacks': 'warn',

      // ── Unicorn ────────────────────────────────────────────────────────
      'unicorn/filename-case': [
        'error',
        { cases: { kebabCase: true, pascalCase: true } },
      ],
      'unicorn/no-null': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-array-for-each': 'warn',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/no-useless-undefined': 'off',
      'unicorn/prefer-string-replace-all': 'warn',
      'unicorn/no-nested-ternary': 'error',
      'unicorn/prefer-ternary': 'off',
      'unicorn/no-array-reduce': 'off',

      // ── Import ordering ────────────────────────────────────────────────
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            { pattern: '@/**', group: 'internal', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-duplicates': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-cycle': 'off', // expensive — enable in CI if needed
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-useless-path-segments': 'error',
    },
  },

  // ─── Enum files: only ban string literal unions ─────────────────────────
  {
    files: ['src/enums/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        banStringLiteralUnion,
      ],
    },
  },

  // ─── Type files: ban enums but allow types ──────────────────────────────
  {
    files: ['src/types/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        banEnumDeclaration,
        banStringLiteralUnion,
      ],
    },
  },

  // ─── shadcn/ui components: disable separation-of-concerns ──────────────
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': 'off',
      'react/no-danger': 'off',
      'unicorn/filename-case': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'jsx-a11y/heading-has-content': 'off',
      curly: 'off',
      'unicorn/no-array-for-each': 'off',
    },
  },

  // ─── TSX component files (excluding ui): full restrictions ──────────────
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/components/ui/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        banStringLiteralUnion,
        banEnumDeclaration,
        banTypeAliasInTsx,
        banInterfaceInTsx,
        banInlineHookFunction,
        banInlineHookArrow,
        banScreamingCaseConst,
        banUtilityFunctions,
        banInlineConstInComponent,
        banNonExportedFunctionInComponent,
      ],
    },
  },

  // ─── Hooks & stores: ban inline types/enums/consts/helpers ──────────────
  {
    files: ['src/hooks/**/*.ts', 'src/stores/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        banEnumDeclaration,
        banStringLiteralUnion,
        banTypeAliasInTsx,
        banInterfaceInTsx,
        banInlineConstInServices,
        banNonExportedFunctionInServices,
      ],
    },
  },

  // ─── Services: ban inline types/enums/consts, allow private helpers ────
  {
    files: ['src/services/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        banEnumDeclaration,
        banStringLiteralUnion,
        banTypeAliasInTsx,
        banInterfaceInTsx,
        banInlineConstInServices,
      ],
    },
  },

  // ─── Test files: relax strict rules ─────────────────────────────────────
  {
    files: ['tests/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'security/detect-possible-timing-attacks': 'off',
      'react/no-danger': 'off',
    },
  },
]);
