# ClawAI Coding Agent

The VS Code coding agent is developed in its own repository,
[ihabkhaled/ClawAI-Coding-Agent](https://github.com/ihabkhaled/ClawAI-Coding-Agent),
and pinned into this one as the `apps/claw-coding-agent` git submodule. Its
documentation lives there, next to its code, and is not copied here:

- [README](https://github.com/ihabkhaled/ClawAI-Coding-Agent/blob/main/README.md) — what it is and how to install it
- [Architecture](https://github.com/ihabkhaled/ClawAI-Coding-Agent/blob/main/docs/ARCHITECTURE.md)
- [Security](https://github.com/ihabkhaled/ClawAI-Coding-Agent/blob/main/docs/SECURITY.md)
- [Testing](https://github.com/ihabkhaled/ClawAI-Coding-Agent/blob/main/docs/TESTING.md)
- [Roadmap](https://github.com/ihabkhaled/ClawAI-Coding-Agent/blob/main/docs/ROADMAP.md)
- [The `.clawai` project folder](https://github.com/ihabkhaled/ClawAI-Coding-Agent/blob/main/docs/CLAWAI_FOLDER_SPEC.md)

In this repository: how a coding-agent change ships (its own repo's release, then
one submodule pointer commit here) is
[rules/53](https://github.com/ihabkhaled/ClawAI/blob/main/rules/53-coding-agent-release-rounds.md);
CI checks that the recorded pointer exists upstream (`submodule-integrity` in
[the CI pipeline](https://github.com/ihabkhaled/ClawAI/blob/main/docs/08-runtime-devops/ci-cd-pipeline.md)).
