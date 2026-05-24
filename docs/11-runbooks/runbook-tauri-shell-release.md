# Runbook — Tauri Desktop Shell Release + Auto-Update

> Owner: Desktop Agent V2 Stream 04 + Stream 10
> Added: 2026-05-24

The ClawAgent desktop shell is a Tauri 2 application that wraps the
Node.js `agent-cli` runtime. This runbook covers building, signing, and
publishing releases plus the auto-update flow that ships with V2.

## What the Tauri shell ships

| Component                      | Where                                            |
| ------------------------------ | ------------------------------------------------ |
| Tray icon + menu               | `agent-cli/src-tauri/src/tray.rs` (V2 — full menu) |
| Global hotkey (Cmd/Ctrl+Shift+A)| `agent-cli/src-tauri/src/hotkey.rs`              |
| Command palette UI             | `agent-cli/src-tauri/ui/index.html`              |
| Auto-updater                   | `agent-cli/src-tauri/src/updater.rs` (V2 — added) |
| Tauri config                   | `agent-cli/src-tauri/tauri.conf.json`            |

Tray menu items (V2 Stream 04):
- Command palette (default shortcut)
- Open Dashboard / Pending approvals / Recipes / Marketplace
- Runner → Pause | Resume
- Pair another device…
- Check for updates
- Settings
- Quit

Tray tooltip refreshes every 30 seconds with the pending approval count
when the API is reachable.

## Release channels

The updater endpoint includes a `{{channel}}` placeholder so we serve
three release tracks from the same Tauri build:

- `stable` — production users; only signed builds that passed the full
  QA matrix (`qa/test-desktop-agent-master.sh` + per-OS evidence).
- `beta` — early adopters; signed builds that passed unit tests + a
  partial QA matrix on the maintainers' OS.
- `canary` — internal dogfood; built off `feature/desktop-agent-v2`
  branches once a day.

Channel selection is read at runtime from `$CLAW_UPDATER_CHANNEL`
(default `stable`).

## Build prerequisites

```bash
# Toolchain (~20 min from cold)
cd agent-cli
npm run tauri:install:unix          # OR tauri:install:windows
# This installs rustup + cargo + tauri-cli + WebView2/WebKit2GTK

# Generate a code-signing keypair for the updater (per release line, kept offline)
cargo install tauri-cli --locked
tauri signer generate --write-keys ~/.claw-updater-keys --password "<vault-supplied>"
# Public key: ~/.claw-updater-keys.pub → paste into
#   tauri.conf.json -> plugins.updater.pubkey
# Private key: ~/.claw-updater-keys → vault only, never committed
```

## Build per OS

```bash
# Universal local debug build (no signing)
npm run tauri:dev

# Production build for the current OS
npm run tauri:build
# Outputs land in agent-cli/src-tauri/target/release/bundle/
```

Per-OS notes:

- **macOS** — universal binary + .dmg + .app.tar.gz signature. Requires
  an Apple Developer ID to notarise.
- **Windows** — .msi + .exe (NSIS) + .zip. Requires Microsoft
  Authenticode certificate for SmartScreen.
- **Linux** — .AppImage + .deb. Optional .rpm via tauri config.

## Signing the updater bundle

```bash
# Sign the produced .tar.gz / .msi / .AppImage
tauri signer sign -k ~/.claw-updater-keys -p "<vault password>" \
  ./src-tauri/target/release/bundle/macos/ClawAgent.app.tar.gz

# Produces ClawAgent.app.tar.gz.sig — upload alongside the bundle to
# the CDN at the path your updater endpoint expects:
#   https://releases.clawai.dev/desktop/macos/x86_64/2.2.0/stable
#     ├── ClawAgent.app.tar.gz
#     ├── ClawAgent.app.tar.gz.sig
#     └── latest.json   ← updater metadata (Tauri format)
```

## Updater metadata (`latest.json`)

Per channel, the CDN serves:

```json
{
  "version": "2.2.1",
  "notes": "Bug fixes + Stream 04 tray menu refresh",
  "pub_date": "2026-05-24T12:00:00Z",
  "platforms": {
    "darwin-x86_64": {
      "signature": "<base64 sig>",
      "url": "https://releases.clawai.dev/desktop/macos/x86_64/2.2.1/stable/ClawAgent.app.tar.gz"
    },
    "darwin-aarch64": {
      "signature": "<base64 sig>",
      "url": "https://releases.clawai.dev/desktop/macos/aarch64/2.2.1/stable/ClawAgent.app.tar.gz"
    },
    "linux-x86_64": {
      "signature": "<base64 sig>",
      "url": "https://releases.clawai.dev/desktop/linux/x86_64/2.2.1/stable/ClawAgent.AppImage"
    },
    "windows-x86_64": {
      "signature": "<base64 sig>",
      "url": "https://releases.clawai.dev/desktop/windows/x86_64/2.2.1/stable/ClawAgent.msi"
    }
  }
}
```

## Auto-update behavior

- **Boot-time check** — 60 seconds after the shell launches,
  `updater::check_and_install_with_handle` queries the configured
  endpoint. On a match, a native notification is shown.
- **Default behavior is NOTIFY-ONLY.** The user must invoke the tray
  menu item "Check for updates" or set `CLAW_UPDATER_AUTO_INSTALL=true`
  to enable background install.
- **Signature verification** — Tauri verifies the bundle signature
  against the pinned `pubkey` in `tauri.conf.json` BEFORE installing.
  A failed signature aborts the install with a notification.

## Rollback procedure

If a release ships a regression:

1. **Stop serving** the bad version in `latest.json` for the affected
   channel: edit the JSON, set `version` back to the last known good
   release, redeploy to the CDN.
2. **No client-side rollback** — desktop apps do not auto-downgrade.
   Users who already installed the bad version must manually
   re-install the prior `.dmg` / `.msi` / `.AppImage` from the
   public releases archive.
3. Tag the bad commit with `RELEASE-REJECTED-v2.2.X` so the release
   pipeline knows not to re-promote.

## See also

- `agent-cli/src-tauri/scripts/install-toolchain.sh` (and `.ps1`)
- `qa/cross-os-validation.md` — per-OS pre-release smoke
- `plan-prompts/ClawAI_desktop_agent_v2_flagship_pack/04_tauri_desktop_shell_tray_hotkey_command_palette.md`
- `plan-prompts/ClawAI_desktop_agent_v2_flagship_pack/10_installation_auto_update_packaging_and_release_channel.md`
