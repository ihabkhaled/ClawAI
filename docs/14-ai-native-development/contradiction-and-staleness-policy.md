# Contradiction & staleness policy

`npm run knowledge:verify` fails on:

- stale generated `.ai` files (source changed, not regenerated),
- broken internal doc links,
- `--no-verify` / hook-bypass recommendations in policy,
- high-severity cross-source contradictions (e.g. port <-> nginx mismatch).

`npm run audit` additionally reports port-coverage gaps, docker-vs-workspace
mismatches, stale numeric claims, and mirrored-instruction duplication. These run
in CI (`.github/workflows/ai-native-os.yml`) and in `release:preflight`.
