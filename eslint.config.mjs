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

const banAsUnknownAsCast = {
  selector:
    'TSAsExpression > TSAsExpression > TSUnknownKeyword',
  message:
    'Do not use `as unknown as X` to bypass type checking. Define a proper type or refactor the code.',
};

const banConsoleCall = {
  selector: 'CallExpression[callee.object.name="console"][callee.property.name=/^(log|debug|info|trace)$/]',
  message:
    'Use NestJS Logger (private readonly logger = new Logger(...)) instead of console.* calls. Logs are shipped to MongoDB via the Pino transport.',
};

const banLetAtModuleScope = {
  selector: 'Program > VariableDeclaration[kind="let"]',
  message:
    'Module-scoped `let` is forbidden. Use `const` for immutable values or move state inside a class/function.',
};

const logicFileRestrictions = [
  banInlineInterface,
  banInlineTypeAlias,
  banInlineEnum,
  banTopLevelConst,
  banExportedTopLevelConst,
  banFunctionDeclaration,
  banStringLiteralUnion,
  banAsUnknownAsCast,
  banConsoleCall,
  banLetAtModuleScope,
];

export default tseslint.config(
  // ── Global ignores ─────────────────────────────────────────────────────────
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/prisma/**',
      '**/src/generated/**',
      '*.config.*',
      '*.mjs',
      '*.cjs',
      '*.js',
      // Tooling configs at a workspace ROOT are outside every tsconfig's
      // `include`, so the type-aware parser cannot resolve a tsconfigRootDir
      // for them and errors before any rule runs. jest.config.ts was ignored
      // for exactly this reason; its Vitest replacements need the same.
      '**/vitest*.config.ts',
      '**/vitest.setup.ts',
    ],
  },

  // ── Parser root ────────────────────────────────────────────────────────────
  // Applies to EVERY file, including ones the typed block below does not match
  // (a spec outside src/, for instance). Without it, typescript-eslint tries to
  // infer the root, finds a tsconfig in each workspace, and refuses with
  // "multiple candidate TSConfigRootDirs are present" — which only shows up
  // when lint-staged batches files from several workspaces into one invocation.
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
  },

  // ── Base configs ───────────────────────────────────────────────────────────
  eslint.configs.recommended,
  ...tseslint.configs.strict,

  // ── Main TypeScript rules ──────────────────────────────────────────────────
  {
    files: ['apps/*/src/**/*.ts', 'packages/*/src/**/*.ts'],
    plugins: {
      security,
      unicorn,
      'import-x': importX,
    },
    languageOptions: {
      parserOptions: {
        // The project service loads only the tsconfig that owns each linted
        // file. The old `project: ['./apps/*/tsconfig.json', …]` glob built
        // every workspace program for a one-file lint, which is why a commit
        // needed an 8 GB heap and a single file took seconds.
        projectService: true,
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
      // Autofixable style; the few remaining hits are fixed by lint-staged
      // (`--fix`) as files are touched. Same for sort-imports below.
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Readability, not correctness; backlog tracked in the lint baseline.
      '@typescript-eslint/no-shadow': 'warn',
      '@typescript-eslint/default-param-last': 'error',
      '@typescript-eslint/no-useless-empty-export': 'error',
      '@typescript-eslint/no-loop-func': 'error',
      // Inference covers these at the type level; backlog in the lint baseline.
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
      // `||` → `??` changes behaviour for '' and 0, so each hit needs a human
      // decision rather than an autofix; backlog in the lint baseline.
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      // Readability; the rewrite can change short-circuit order, so not autofixed.
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
      // A rule stays 'warn' only with a reason. Warnings are not a free pass:
      // lint-staged fails a commit on any warning in a staged file, and CI
      // fails any warning above tools/lint/warnings-baseline.json (rules/23).
      // Heuristic on any `obj[key]`; ~200 hits, nearly all typed-key lookups.
      'security/detect-object-injection': 'warn',
      // Admin-configured patterns are built at runtime behind length and ReDoS
      // checks; each remaining hit is reviewed when its file is next touched.
      'security/detect-non-literal-regexp': 'warn',
      // Fires on any `x === null` when x is named like a token; both hits are
      // null checks, not secret comparisons.
      'security/detect-possible-timing-attacks': 'warn',
      // Services read files from configured directories; ~90 hits to review
      // file by file rather than suppress.
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'error',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-pseudoRandomBytes': 'error',
      // Star-height heuristic with false positives; ~80 hits, each to be
      // rewritten or proven linear when its file is next touched.
      'security/detect-unsafe-regex': 'warn',

      // ── Unicorn ──────────────────────────────────────────────────────────
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/no-for-each': 'error',
      // Style-only rules below stay 'warn' because their backlog is large;
      // the baseline ratchet stops it growing.
      'unicorn/no-useless-undefined': 'warn',
      'unicorn/prefer-ternary': 'warn',
      'unicorn/no-nested-ternary': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-some': 'warn',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-number-properties': 'error',
      'unicorn/no-lonely-if': 'error',
      'unicorn/no-array-push-push': 'error',
      'unicorn/prefer-spread': 'error',
      'unicorn/prefer-string-replace-all': 'warn',
      'unicorn/prefer-at': 'error',
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
      // Autofixable; lint-staged's --fix clears it in every file it touches.
      'sort-imports': [
        'warn',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
        },
      ],

      // ── File-size discipline (warn at 500 lines; hard target is per-file) ──
      // Splits guidance: services <300 lines, managers <500 lines, adapters
      // <500 lines, utilities <300 lines. Warning is informational; service-level
      // overrides below promote service files to error at higher thresholds.
      'max-lines': [
        'warn',
        { max: 500, skipBlankLines: true, skipComments: true },
      ],

      // ── Promotion path ────────────────────────────────────────────────────
      // Every rule above or below that is still 'warn' has a backlog recorded
      // in tools/lint/warnings-baseline.json. A rule is promoted to 'error' as
      // soon as its baseline count reaches zero (2026-10-13: the zero-count
      // security and unicorn rules were promoted). Never promote a rule with a
      // non-zero baseline — CI would fail on code nobody touched.
    },
  },

  // ── Service files: logic restrictions + size limits ────────────────────────
  {
    files: ['apps/*/src/**/*.service.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...logicFileRestrictions],
      // Size and branching budgets are design signals, not defects; the
      // backlog is in the lint baseline and shrinks as files are split.
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 10],
    },
  },

  // ── Controller files: logic restrictions + no try/catch/throw ──────────────
  {
    files: ['apps/*/src/**/*.controller.ts'],
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
    files: ['apps/*/src/**/*.repository.ts'],
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
      'apps/*/src/**/*.module.ts',
      'apps/*/src/**/*.guard.ts',
      'apps/*/src/**/*.interceptor.ts',
      'apps/*/src/**/*.filter.ts',
      'apps/*/src/**/*.pipe.ts',
      'apps/*/src/**/*.adapter.ts',
    ],
    rules: {
      'no-restricted-syntax': ['error', ...logicFileRestrictions],
    },
  },

  // ── Manager files: logic restrictions + size limits ─────────────────────────
  {
    files: ['apps/*/src/**/*.manager.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...logicFileRestrictions],
      // Size and branching budgets are design signals, not defects; the
      // backlog is in the lint baseline and shrinks as files are split.
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 15],
    },
  },

  // ── Utility files: no inline types/consts (only exported functions) ────────
  {
    files: ['apps/*/src/**/*.utility.ts', 'apps/*/src/**/*.utilities.ts'],
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
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
      'security/detect-unsafe-regex': 'off',
    },
  },

  // ── Runtime-validated path/regex sites ─────────────────────────────────────
  // These files take dynamic paths/regexes that are validated upstream by
  // dedicated wrapper utilities (resolveSafePath, compilePolicyPattern,
  // sanitised/audited HTML scrapers). Static analysis can't follow the
  // validation chain, so we silence the false-positive security warnings here.
  // Any new file added to this list should have a clear runtime gate.
  {
    files: [
      // llamacpp downloads + binary install + spawn — paths gated by
      // resolveSafePath() and binary fingerprint validation.
      'apps/claw-llamacpp-service/src/common/utilities/archive.utility.ts',
      'apps/claw-llamacpp-service/src/common/utilities/dri.utility.ts',
      'apps/claw-llamacpp-service/src/common/utilities/sha256.utility.ts',
      'apps/claw-llamacpp-service/src/modules/binary/managers/binary-installer.manager.ts',
      'apps/claw-llamacpp-service/src/modules/catalog/managers/catalog-refresh.manager.ts',
      'apps/claw-llamacpp-service/src/modules/models-lifecycle/managers/llama-server-launcher.manager.ts',
      'apps/claw-llamacpp-service/src/modules/pull-jobs/managers/pull-job-runner.manager.ts',
      // file-service uploads — paths derived from sanitized DB records via
      // FileSecurityManager (magic-byte + ZIP-bomb + AV scanning).
      'apps/claw-file-service/src/common/utilities/file-storage.utility.ts',
      'apps/claw-file-service/src/common/utilities/file-validator.utility.ts',
      // research-service scraper regexes — audited HTML extractors with
      // bounded input length and timeouts.
      'apps/claw-research-service/src/modules/search/adapters/ollama-web.adapter.ts',
      'apps/claw-research-service/src/modules/search/adapters/searxng.adapter.ts',
      // ollama-service catalog scrapers — audited HTML regexes with bounded
      // input length and timeouts.
      'apps/claw-ollama-service/src/modules/ollama/constants/discovery.constants.ts',
      'apps/claw-ollama-service/src/modules/ollama/managers/ollama-library-discovery.manager.ts',
      'apps/claw-ollama-service/src/modules/ollama/utilities/catalog-reference.utility.ts',
      'apps/claw-ollama-service/src/modules/ollama/utilities/search-browser-classifier.utility.ts',
      // agent-service recipe DSL + capability risk — patterns compiled via
      // `compilePolicyPattern` with ReDoS guard.
      'apps/claw-agent-service/src/common/constants/recipe.constants.ts',
      'apps/claw-agent-service/src/common/utilities/recipe-expression.utility.ts',
      'apps/claw-agent-service/src/modules/agent/services/capability-risk.service.ts',
      'apps/claw-agent-service/src/modules/fleet/utilities/saml-verifier.utility.ts',
    ],
    rules: {
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
      'security/detect-unsafe-regex': 'off',
    },
  },
);
