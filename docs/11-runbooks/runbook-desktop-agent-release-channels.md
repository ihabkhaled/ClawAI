# Runbook — Desktop Agent Release Channels + CI Pipeline

> Owner: Desktop Agent V2 Stream 10
> Added: 2026-05-24

ClawAgent ships in three concurrent release channels — `stable`,
`beta`, `canary` — served from the same CDN under per-channel paths.
This runbook covers the CI workflow that builds + signs + publishes
each channel and the promotion rules between them.

## Channel rules

| Channel  | Audience                             | Source                                                      | QA bar                                                  |
| -------- | ------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------- |
| `canary` | Internal dogfood (ClawAI engineers)  | Every commit to `feature/desktop-agent-v2`                  | Unit + typecheck + lint green                           |
| `beta`   | Early-adopter customers              | Tagged commits matching `v*-beta` on `main`                 | Canary green + maintainer-OS QA evidence                |
| `stable` | All production users                 | Tagged commits matching `v*` (no suffix) on `main`          | Full cross-OS QA matrix (`runbook-cross-os-evidence.md`) |

Promotion happens by re-tagging: a canary build that survives 7 days
without rollback can be re-tagged as the next beta; a beta that
survives 14 days can be re-tagged as the next stable.

## CI workflow scaffold (`.github/workflows/desktop-agent-release.yml`)

```yaml
name: Desktop Agent Release

on:
  push:
    tags:
      - 'desktop-agent-v*'

permissions:
  contents: write
  id-token: write   # for OIDC into the release CDN

env:
  TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
  TAURI_KEY_PASSWORD: ${{ secrets.TAURI_KEY_PASSWORD }}
  CDN_BUCKET: releases-clawai-dev

jobs:
  build-per-os:
    strategy:
      fail-fast: false
      matrix:
        os: [macos-14, ubuntu-22.04, windows-2022]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: dtolnay/rust-toolchain@stable
      - name: Install Tauri CLI
        run: cargo install tauri-cli --version "^2" --locked
      - name: Install agent-cli deps
        run: npm ci --workspace agent-cli
      - name: Tauri build
        working-directory: agent-cli
        run: npm run tauri:build
      - name: Sign bundles (Tauri updater format)
        run: tauri signer sign -k "$TAURI_PRIVATE_KEY" -p "$TAURI_KEY_PASSWORD" \
          ./agent-cli/src-tauri/target/release/bundle/**/*
      - name: Publish to CDN
        run: |
          aws s3 sync ./agent-cli/src-tauri/target/release/bundle/ \
            "s3://$CDN_BUCKET/desktop/${{ matrix.os }}/${{ github.ref_name }}/${{ env.CHANNEL }}/"
        env:
          CHANNEL: ${{ contains(github.ref_name, '-beta') && 'beta' || contains(github.ref_name, '-canary') && 'canary' || 'stable' }}
      - name: Refresh latest.json
        run: node ./scripts/build-latest-json.mjs \
          --channel "$CHANNEL" --version "${{ github.ref_name }}" \
          --bucket "$CDN_BUCKET"
```

## Latest.json (per channel)

The Tauri updater queries:
```
https://releases.clawai.dev/desktop/{{target}}/{{arch}}/{{current_version}}/{{channel}}
```

Each channel keeps its own `latest.json`. See
`runbook-tauri-shell-release.md` for the exact schema.

## Rolling back a bad release

Already covered in `runbook-tauri-shell-release.md` § Rollback procedure.

## Per-channel update cadence

- **canary**: every successful CI run on the v2 branch — multiple per day
- **beta**: once a week after canary soak
- **stable**: once every 2-4 weeks after beta soak

The Tauri updater respects `Cache-Control: max-age=300` on `latest.json`
so a CDN cache miss adds at most 5 minutes to detection time.

## See also

- `docs/11-runbooks/runbook-tauri-shell-release.md` — bundle signing,
  per-OS build commands
- `agent-cli/src-tauri/tauri.conf.json` — updater endpoint + pubkey
- `agent-cli/src-tauri/src/updater.rs` — boot-time + tray-menu update check
