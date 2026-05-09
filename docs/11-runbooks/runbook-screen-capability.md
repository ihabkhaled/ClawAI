# Runbook — Screen Capability (Stream 21)

The SCREEN provider at `agent-cli/src/capability-providers/screen/index.js` captures the screen via OS-native tools and runs OCR via tesseract.

## Operations

| Op | Behavior |
|---|---|
| `CAPTURE_FULLSCREEN` | Returns `{contentBase64, mimeType: 'image/png', size}` |
| `OCR` | Captures fullscreen, runs tesseract, returns `{text, length}` |

## Per-OS dependencies

| OS | Screencapture binary | OCR binary |
|---|---|---|
| macOS | `screencapture` (built-in) | `brew install tesseract` |
| Linux Wayland | `grim` (`apt install grim`) | `apt install tesseract-ocr` |
| Linux X11 | ImageMagick `import` | `apt install tesseract-ocr` |
| Windows | PowerShell + System.Drawing (built-in) | `choco install tesseract` or [UB-Mannheim installer](https://digi.bib.uni-mannheim.de/tesseract/) |

## Permissions handshake

- **macOS**: System Settings → Privacy & Security → Screen Recording → ClawAgent (one-time prompt)
- **Linux Wayland**: PipeWire portal prompts on first capture
- **Windows**: no separate prompt

## Common operational issues

### "SCREEN.OCR throws 'tesseract not installed'"

The provider runs `tesseract --help` to verify before piping the screenshot. Install tesseract per the OS table above. The binary must be on PATH.

### "Captured image is blank / black"

Permission denied. macOS often silently permits but the resulting bitmap is blank. Re-grant Screen Recording permission and restart agent-cli.

### "Capture buffer is huge (>16MB) and the call fails"

The provider caps at 16 MB. Multi-monitor 4K setups can exceed this. Consider scoping to one monitor (planned) or compressing.

## Related documents

- [Capability Framework Runbook](runbook-capability-framework.md)
