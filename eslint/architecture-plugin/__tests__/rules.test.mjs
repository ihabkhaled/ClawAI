// Rule unit tests using ESLint's RuleTester. Run with `node --test`.
// Proves each custom architecture rule fires on invalid code and stays silent
// on valid code — the enforcement-has-a-test requirement for custom rules.
import { test } from 'node:test';
import { RuleTester } from 'eslint';
import noCrossService from '../rules/no-cross-service-internal-imports.mjs';
import controllerNoLogic from '../rules/controller-no-logic.mjs';
import repositoryNoThrow from '../rules/repository-no-throw.mjs';
import noProcessEnv from '../rules/no-process-env-outside-config.mjs';

// Use the real TS parser the repo already depends on (typescript-eslint).
import tseslint from 'typescript-eslint';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    ecmaVersion: 2023,
    sourceType: 'module',
  },
});

test('no-cross-service-internal-imports', () => {
  ruleTester.run('no-cross-service-internal-imports', noCrossService, {
    valid: [
      {
        filename: 'apps/claw-chat-service/src/x.service.ts',
        code: `import { A } from '@claw/shared-types';`,
      },
      {
        filename: 'apps/claw-chat-service/src/x.service.ts',
        code: `import { B } from './local.js';`,
      },
    ],
    invalid: [
      {
        filename: 'apps/claw-chat-service/src/x.service.ts',
        code: `import { X } from '../../claw-auth-service/src/thing.js';`,
        errors: [{ messageId: 'crossService' }],
      },
    ],
  });
});

test('controller-no-logic', () => {
  ruleTester.run('controller-no-logic', controllerNoLogic, {
    valid: [
      {
        filename: 'apps/claw-auth-service/src/auth.controller.ts',
        code: `class C { login(dto) { return this.svc.login(dto); } }`,
      },
    ],
    invalid: [
      {
        filename: 'apps/claw-auth-service/src/auth.controller.ts',
        code: `class C { m() { try { return 1; } catch (e) { return 2; } } }`,
        errors: [{ messageId: 'noTry' }],
      },
      {
        filename: 'apps/claw-auth-service/src/auth.controller.ts',
        code: `class C { m() { throw new Error('x'); } }`,
        errors: [{ messageId: 'noThrow' }],
      },
      {
        filename: 'apps/claw-auth-service/src/auth.controller.ts',
        code: `class C { m() { const a = 1; const b = 2; const c = 3; const d = 4; return d; } }`,
        errors: [{ messageId: 'tooLong' }],
      },
    ],
  });
});

test('repository-no-throw', () => {
  ruleTester.run('repository-no-throw', repositoryNoThrow, {
    valid: [
      {
        filename: 'apps/claw-chat-service/src/x.repository.ts',
        code: `class R { find() { return null; } }`,
      },
    ],
    invalid: [
      {
        filename: 'apps/claw-chat-service/src/x.repository.ts',
        code: `class R { find() { throw new Error('nope'); } }`,
        errors: [{ messageId: 'noThrow' }],
      },
    ],
  });
});

test('no-process-env-outside-config', () => {
  ruleTester.run('no-process-env-outside-config', noProcessEnv, {
    valid: [
      {
        filename: 'apps/claw-chat-service/src/app.config.ts',
        code: `const x = process.env.FOO;`,
      },
      {
        filename: 'apps/claw-chat-service/src/x.service.ts',
        code: `const x = AppConfig.get().FOO;`,
      },
    ],
    invalid: [
      {
        filename: 'apps/claw-chat-service/src/x.service.ts',
        code: `const x = process.env.FOO;`,
        errors: [{ messageId: 'noProcessEnv' }],
      },
    ],
  });
});
