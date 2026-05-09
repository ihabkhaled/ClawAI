# Runbook — Application Capability (Stream 23)

Provider at `agent-cli/src/capability-providers/application/index.js` drives native OS UI via `@nut-tree-fork/nut-js`.

## Operations

| Op | Target | Behavior |
|---|---|---|
| `LAUNCH` | `{binary, args?}` + `{cwd?}` | Spawns binary detached |
| `FOCUS` | `{windowTitleRegex}` | Brings matching window to front |
| `CLOSE` | `{windowTitleRegex}` | Sends Cmd-Q (macOS) / Alt+F4 (others) |
| `SEND_KEYS` | optionally `{windowTitleRegex}` + `{text}` | Types into focused window |
| `GET_STATE` | none | Returns `{windowTitles, activeWindow}` |

## Required setup

```bash
npm i @nut-tree-fork/nut-js -w agent-cli
```

The original `@nut-tree/nut-js` was unpublished from npm; we use the community fork. The provider tries the fork first then the original namespace if a private mirror exists.

## Per-OS native deps

`@nut-tree-fork/nut-js` ships prebuilt native bindings for:
- Windows x64
- macOS x64 + arm64
- Linux x64 (requires `libxtst-dev`, `libpng-dev` at install time on some distros)

## Common operational issues

### "FOCUS: no window matched <regex>"

The window title regex is matched against `window.title` exactly as the OS reports it. Common gotchas:
- macOS: include the document title (e.g., `^MyDoc — App$`)
- Windows: usually `^<doc>.* - <App>$`
- Linux: depends on WM; check `wmctrl -l` first

### "GET_STATE returns 100 windows but mine is missing"

The provider caps at the first 100 visible windows. Hidden / minimised / off-screen windows may be filtered by the WM. Use `wmctrl -lG` (Linux) / `osascript -e 'tell app "System Events" ...'` (macOS) to verify.

### "SEND_KEYS doesn't reach a sandboxed app (e.g., Zoom)"

Some apps refuse synthetic input from accessibility APIs. macOS requires explicit Accessibility entitlement; the user must grant it via System Settings → Privacy → Accessibility → ClawAgent. Without that, SEND_KEYS silently no-ops on those apps.

### "LAUNCH fails on Windows when binary is not absolute"

The provider rejects relative `binary` paths. Use full paths like `C:\\Program Files\\App\\app.exe`.

## Live test

```bash
node -e "
import('./agent-cli/src/capability-providers/index.js').then(async ({ providerRegistry }) => {
  const r = await providerRegistry.get('APPLICATION').execute({
    operation: 'GET_STATE', target: {}, payload: {},
  });
  console.log('windows:', r.output.windowTitles.length, 'active:', r.output.activeWindow);
});
"
```

## Related documents

- [Capability Framework Runbook](runbook-capability-framework.md)
