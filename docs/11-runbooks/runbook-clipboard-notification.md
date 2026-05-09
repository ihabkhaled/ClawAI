# Runbook — Clipboard + Notification Capabilities (Stream 22)

Two providers covered:
- `agent-cli/src/capability-providers/clipboard/index.js` — text + image clipboard
- `agent-cli/src/capability-providers/notification/index.js` — desktop notifications

## CLIPBOARD operations

| Op | Behavior |
|---|---|
| `READ` | Returns `{content, length}` (text) |
| `WRITE` | Replaces clipboard text. **IRREVERSIBLE** — no undo |
| `READ_IMAGE` | Returns base64-encoded PNG (macOS/Linux only) |
| `WRITE_IMAGE` | Sets clipboard image |

## CLIPBOARD per-OS

| OS | Read text | Write text | Image |
|---|---|---|---|
| macOS | `pbpaste` | `pbcopy` | `osascript` |
| Linux Wayland | `wl-paste` | `wl-copy` | `wl-paste --type image/png` |
| Linux X11 | `xclip -o` | `xclip` | `xclip -t image/png` |
| Windows | `Get-Clipboard` | `Set-Clipboard` | not yet wired |

## NOTIFICATION operations

| Op | Behavior |
|---|---|
| `NOTIFY` | Displays OS-native notification with `title` + `body`. **IRREVERSIBLE** |

| OS | Backend |
|---|---|
| macOS | `osascript -e 'display notification ...'` |
| Linux | `notify-send` (libnotify) |
| Windows | `msg *` (built-in fallback) |

## Common operational issues

### "wl-paste fails even on Wayland"

Some compositors (sway, GNOME 40+) require a XDG-portal session. If `wl-paste` errors, the provider falls back to `xclip` via `2>/dev/null ||`. If both fail, install `wl-clipboard`:

```bash
sudo apt install wl-clipboard xclip
```

### "Windows clipboard image not implemented"

Stream 22 v2 plan. To implement: bundle `node-windows-clipboard` or shell to PowerShell with `Add-Type` + System.Windows.Forms.Clipboard. Tracking ticket pending.

### "Notifications don't appear on Linux"

`notify-send` requires libnotify daemon. On servers / minimal installs, install:

```bash
sudo apt install libnotify-bin
```

Some DEs (e.g. KDE) need `dbus-launch` to be running.

### "macOS notification missing app icon"

`osascript` notifications use the default Script Editor icon. Production should bundle a proper macOS app to associate the agent's icon.

## Related documents

- [Capability Framework Runbook](runbook-capability-framework.md)
