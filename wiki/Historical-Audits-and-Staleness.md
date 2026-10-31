# Historical Audits and Staleness

The repo contains many valuable historical architecture audits and scorecards, but some predate the current tree.

## Confirmed drift

- Older docs give **17** as the service count; the generated services manifest now lists **<!-- count:services -->21<!-- /count -->**.
- Some docs/context give **23** or **24** as the workspace count; the generated manifest now lists **<!-- count:workspaces -->28<!-- /count -->**.
- Older frontend audits predate the current **155 generated route records**.
- Older testing audits predate the current **<!-- count:specFiles -->2767<!-- /count -->** generated test files and the Vitest migration.

## Wiki evidence policy

1. Current generated manifests for inventories/counts.
2. Live code/config for actual behavior.
3. Canonical rules/context for intended boundaries.
4. Dated audits for historical analysis.
5. Visible notes where sources disagree.

Historical sources include [docs/MASTER_AUDIT.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/MASTER_AUDIT.md), [docs/FULL_LIFECYCLE_AUDIT.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/FULL_LIFECYCLE_AUDIT.md), and [docs/RELEASE_READINESS_SCORECARD.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/RELEASE_READINESS_SCORECARD.md).
