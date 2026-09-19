# Getting Started

## Before touching code

ClawAI's canonical workflow begins with:

```bash
npm run knowledge:context -- --task="<what you are doing>"
npm run affected:list
```

Then read the generated task context and the rules/skills/reviewers it cites. The repository explicitly forbids inventing architecture facts: derive them from current manifests and code.

## Local runtime

Use the supported setup/runtime path documented in [README.md](https://github.com/ihabkhaled/ClawAI/blob/main/README.md), [.ai/BOOTSTRAP.md](https://github.com/ihabkhaled/ClawAI/blob/main/.ai/BOOTSTRAP.md), [context/stack-and-toolchain.md](https://github.com/ihabkhaled/ClawAI/blob/main/context/stack-and-toolchain.md), and [scripts/claw.sh](https://github.com/ihabkhaled/ClawAI/blob/main/scripts/claw.sh).

## Validation

Validate the workspaces actually affected by the change. Full release readiness is handled by release preflight rather than repeatedly running every workspace during each edit.

Related: [[Development Workflow|Development-Workflow]] · [[Testing and QA|Testing-and-QA]] · [[AI Native Engineering System|AI-Native-Engineering-System]].
