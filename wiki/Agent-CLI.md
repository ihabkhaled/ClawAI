# Agent CLI and Desktop Runtime

The built-in `agent-cli/` tree currently contains **53 files** and combines a Node.js runtime with a Tauri desktop shell.

## Major areas

- **Authentication:** device code, pairing, auth store.
- **API client:** communication with ClawAI's agent backend.
- **Capability providers:** application, audio, browser, clipboard, filesystem, notifications, processes, screen, system and terminal.
- **Commands:** login/logout/register/start/status/whoami, devices, doctor, config and recipe execution.
- **Runtime:** capability runner, cloud synchronization and process spawning.
- **Activity memory:** local store and smoke coverage.
- **Desktop shell:** Rust/Tauri commands, hotkeys, tray, updater and UI shell.

## Security model

Capabilities are not equivalent to arbitrary remote shell access. Server-side policy/risk/scopes and client-side capability providers form a layered approval boundary. For backend details see [[Service-Agent]] and [[Security-Architecture]].
