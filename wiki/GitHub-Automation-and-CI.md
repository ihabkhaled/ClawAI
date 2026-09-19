# GitHub Automation and CI

The `.github/` tree contains contribution/security metadata and workflows for:

- main CI with affected-workspace detection;
- AI-native knowledge/audit gates;
- GPU detection for `claw.sh`;
- production deployment;
- Lighthouse;
- releases.

## Main CI strategy

The current CI detects affected workspaces first, then runs lint, typecheck, tests and build only where needed. Chat changes also trigger Runtime V2 security/Redis lanes. The Coding Agent gitlink gets a submodule-integrity check.

## Knowledge CI

The AI-native workflow verifies:

- audit snapshot freshness;
- generated `.ai` freshness;
- knowledge integrity;
- knowledge coverage;
- tooling tests;
- architecture ESLint rule tests.

See [[CI-CD-Pipeline]], [[Quality-Gates]], and [[AI-Native-Engineering-OS]].
