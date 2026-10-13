> **Canonical source:** [`docs/08-runtime-devops/ci-cd-pipeline.md`](https://github.com/ihabkhaled/ClawAI/blob/main/docs/08-runtime-devops/ci-cd-pipeline.md)

# CI/CD Pipeline

`ci.yml` is the one gate a change has to pass: install once, build shared packages
and Prisma clients once, then lint (with a warning ratchet), typecheck, test with
coverage, build, plus policy, secret, CodeQL and image scans. `ai-native-os.yml`
runs inside it. `CI success` aggregates every job, and `release.yml` runs only
after `CI` succeeds on main — so any red job blocks the release and the deploy.

The full job list, what each job proves, and how to fix a red one are in the
canonical source above.
