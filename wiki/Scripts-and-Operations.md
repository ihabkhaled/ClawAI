# Scripts and Operations

The `scripts/` tree currently contains **35 files** spanning installation, local runtime, deployment, TLS, QA experiments and runtime probes.

## Main entrypoints

- `scripts/claw.sh` — canonical Docker/runtime entrypoint.
- `install.sh` / `install.ps1` — platform installation.
- `install-tls.sh` / `install-tls.ps1` — local/internal TLS setup.
- `install-letsencrypt.sh` — public edge TLS for eligible production hosts.
- `deploy-prod.sh` — production deployment helper.
- `clean.sh` / `clean.ps1` — cleanup.
- `install-agent-tooling.*` — local agent tooling setup.

## Local-runtime probes

Dedicated probes exist for Ollama, llama.cpp, ComfyUI and Stable Diffusion WebUI, with normalized fixtures/utilities.

## QA lab

The `scripts/qa-lab/` suite includes authorization, concurrency, cross-thread, memory, paraphrase, performance and stress-context experiments plus transcript export and verification utilities.

See [[QA-Labs]], [[Docker-Guide]], [[Operational-Runbooks]], and [[Troubleshooting]].
