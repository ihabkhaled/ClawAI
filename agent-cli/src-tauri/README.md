# ClawAgent — Tauri Shell (Stream 30 — scaffold)

This directory contains the Tauri desktop shell that wraps the Node.js
agent-cli runtime in a system-tray UI with a global hotkey and command
palette.

## Status

**Scaffold only — not yet built.** All Rust + TOML + JSON files are in
place and follow the Tauri v2 conventions, but the project has never
been `cargo build`'d in this repo because:

1. The Rust toolchain (rustc + cargo + tauri-cli) is not yet bundled
   into the dev-environment install scripts.
2. Tauri requires per-OS build dependencies (WebKit on Linux,
   WebView2 on Windows, native macOS frameworks).
3. The icon assets in `icons/` are placeholders — production icons
   need to be designed and exported in 5 sizes per OS.

## How to build (when toolchain is ready)

```bash
# install Rust + cargo
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# install tauri CLI
cargo install tauri-cli --version "^2"

cd agent-cli/src-tauri
cargo tauri build
```

Outputs land in `target/release/bundle/<os>/`.

## Architecture

- `src/main.rs` — entry point; wires plugins (shell, global-shortcut,
  notification, clipboard-manager, os).
- `src/commands.rs` — Tauri command handlers exposed to the frontend
  via `tauri::invoke`. Proxies to the cloud-side ClawAI API on
  localhost:4000.
- `src/tray.rs` — system tray installation; menu items "Open Dashboard",
  "Pending Approvals", "Quit".
- `src/hotkey.rs` — global hotkey registration; Cmd/Ctrl+Shift+A
  toggles the command palette window.
- `tauri.conf.json` — bundle configuration; CSP locks connect-src to
  localhost:4000 only.
- `ui/index.html` — vanilla HTML+JS command palette UI; polls
  `get_pending_capabilities` every 5 seconds.

## Auth

The Tauri shell expects a device-token in the OS keychain via the
`keyring` crate (TODO: add as a Cargo dep). For dev iteration, set the
`CLAW_AGENT_TOKEN` env var with a valid device access token.

## What's deferred

- Real icon designs (5 sizes per OS)
- Keychain integration for device-token storage
- Auto-update via `tauri-plugin-updater`
- Code signing per OS (Apple Developer ID, Windows EV cert, Linux GPG)
- CI build pipeline producing .app/.dmg/.msi/.AppImage artifacts

These are bounded follow-ups; the framework code in this directory is
ready for `cargo tauri build` once the toolchain is installed.
