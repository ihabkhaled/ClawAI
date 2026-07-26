// ClawAI architecture ESLint plugin. Tested custom rules that mechanically
// enforce the layer/service conventions described in architecture.config.mjs.
// Rules ship as an opt-in flat config (`recommended`) so they can be ratcheted
// in per workspace without breaking the existing tuned lint in one step.
import { createRequire } from 'node:module';

import noCrossServiceInternalImports from './rules/no-cross-service-internal-imports.mjs';
import controllerNoLogic from './rules/controller-no-logic.mjs';
import repositoryNoThrow from './rules/repository-no-throw.mjs';
import noProcessEnvOutsideConfig from './rules/no-process-env-outside-config.mjs';

export const rules = {
  'no-cross-service-internal-imports': noCrossServiceInternalImports,
  'controller-no-logic': controllerNoLogic,
  'repository-no-throw': repositoryNoThrow,
  'no-process-env-outside-config': noProcessEnvOutsideConfig,
};

// Version read from the root package.json rather than written here. ESLint only
// uses plugin.meta.version for cache keys and diagnostics, so a stale literal is
// harmless until the day it is not — and it had already drifted to 0.1.0 against a
// 1.0.0 repository.
const { version } = createRequire(import.meta.url)('../../package.json');

const plugin = {
  meta: { name: '@claw/eslint-architecture', version },
  rules,
};

/** Opt-in flat config: apply to backend service source only. */
export const recommended = {
  name: '@claw/architecture/recommended',
  files: ['apps/claw-*-service/src/**/*.ts'],
  ignores: ['**/*.spec.ts', '**/*.test.ts'],
  plugins: { '@claw/architecture': plugin },
  rules: {
    '@claw/architecture/no-cross-service-internal-imports': 'error',
    '@claw/architecture/controller-no-logic': 'error',
    '@claw/architecture/repository-no-throw': 'error',
    '@claw/architecture/no-process-env-outside-config': 'error',
  },
};

export default plugin;
