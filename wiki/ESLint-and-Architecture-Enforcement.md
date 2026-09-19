# ESLint and Architecture Enforcement

ClawAI's root `eslint.config.mjs` is an architecture-enforcement layer, not only a style configuration.

It applies targeted rules across:

- backend services, controllers, repositories, managers, guards, interceptors, adapters and utilities;
- frontend architecture;
- shared packages;
- known exception/compatibility files;
- repository-wide declaration and import boundaries.

The repository also ships an `eslint/architecture-plugin/` with its own RuleTester suite, and CI has a dedicated **architecture-rules** job.

## Why this matters

Architectural expectations such as layer boundaries and ownership are made executable. That reduces the gap between “documented convention” and “what CI actually blocks.”

See [[Backend-Coding-Standards]], [[Frontend-Coding-Standards]], [[Rules-Catalog]], and [[CI-CD-Pipeline]].
