# CI/CD and GitHub Actions

## Current workflows

- [.github/workflows/ai-native-os.yml](https://github.com/ihabkhaled/ClawAI/blob/main/.github/workflows/ai-native-os.yml)
- [.github/workflows/ci.yml](https://github.com/ihabkhaled/ClawAI/blob/main/.github/workflows/ci.yml)
- [.github/workflows/claw-sh-gpu-detection.yml](https://github.com/ihabkhaled/ClawAI/blob/main/.github/workflows/claw-sh-gpu-detection.yml)
- [.github/workflows/deploy-production.yml](https://github.com/ihabkhaled/ClawAI/blob/main/.github/workflows/deploy-production.yml)
- [.github/workflows/lighthouse.yml](https://github.com/ihabkhaled/ClawAI/blob/main/.github/workflows/lighthouse.yml)
- [.github/workflows/release.yml](https://github.com/ihabkhaled/ClawAI/blob/main/.github/workflows/release.yml)

CI/CD combines Actions with local Husky hooks, affected-workspace tooling, generated knowledge verification, architecture checks, release preflight, Lighthouse, deployment automation and release versioning.

Related:
- [.husky/pre-commit](https://github.com/ihabkhaled/ClawAI/blob/main/.husky/pre-commit)
- [.husky/pre-push](https://github.com/ihabkhaled/ClawAI/blob/main/.husky/pre-push)
- [tools/release/](https://github.com/ihabkhaled/ClawAI/blob/main/tools/release)
- [tools/gates/receipt.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/tools/gates/receipt.mjs)
