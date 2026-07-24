// ClawAI architecture ESLint plugin. Tested custom rules that mechanically
// enforce the layer/service conventions described in architecture.config.mjs.
// Rules ship as an opt-in flat config (`recommended`) so they can be ratcheted
// in per workspace without breaking the existing tuned lint in one step.
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

const plugin = {
  meta: { name: '@claw/eslint-architecture', version: '0.1.0' },
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
