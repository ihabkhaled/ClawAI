# ESLint and Architecture Enforcement

The root ESLint configuration is the live strict quality gate; `eslint/` adds architecture-specific enforcement designed to ratchet in safely.

## Custom architecture rules
- `no-cross-service-internal-imports`
- `controller-no-logic`
- `repository-no-throw`
- `no-process-env-outside-config`

| File | Bytes |
| --- | --- |
| [eslint/architecture-plugin/__tests__/rules.test.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/eslint/architecture-plugin/__tests__/rules.test.mjs) | 3464 |
| [eslint/architecture-plugin/index.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/eslint/architecture-plugin/index.mjs) | 1897 |
| [eslint/architecture-plugin/rules/controller-no-logic.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/eslint/architecture-plugin/rules/controller-no-logic.mjs) | 1743 |
| [eslint/architecture-plugin/rules/no-cross-service-internal-imports.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/eslint/architecture-plugin/rules/no-cross-service-internal-imports.mjs) | 1150 |
| [eslint/architecture-plugin/rules/no-process-env-outside-config.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/eslint/architecture-plugin/rules/no-process-env-outside-config.mjs) | 1087 |
| [eslint/architecture-plugin/rules/repository-no-throw.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/eslint/architecture-plugin/rules/repository-no-throw.mjs) | 734 |
| [eslint/architecture.config.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/eslint/architecture.config.mjs) | 2733 |
| [eslint/README.md](https://github.com/ihabkhaled/ClawAI/blob/main/eslint/README.md) | 2794 |

Run `npm run architecture:check` for the custom-rule test suite. See [eslint/README.md](https://github.com/ihabkhaled/ClawAI/blob/main/eslint/README.md).
