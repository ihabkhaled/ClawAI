# Runbook — Audio Capability (Stream 24)

Provider at `agent-cli/src/capability-providers/audio/index.js` shells out to `whisper.cpp` for STT and `piper` for TTS.

## Operations

| Op | Target | Behavior |
|---|---|---|
| `TRANSCRIBE` | `{audioPath, language?}` | Runs whisper-cli, returns `{text, language}` |
| `SYNTHESIZE` | `{voicePath}` + `{text}` | Runs piper, returns `{contentBase64, mimeType: 'audio/wav', size}` |

## Required setup

### whisper.cpp (STT)

1. Download release for your OS:
   - macOS / Linux: `brew install whisper-cpp` (or build from source)
   - Windows: Get `whisper-bin-x64.zip` from https://github.com/ggml-org/whisper.cpp/releases
2. Download a model:
   ```bash
   wget -O ~/whisper-models/ggml-base.en.bin \
     https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin
   ```
3. Set env vars:
   ```bash
   export WHISPER_CLI_PATH=/path/to/whisper-cli
   export WHISPER_MODEL_PATH=$HOME/whisper-models/ggml-base.en.bin
   ```

### Piper (TTS)

1. Download release: https://github.com/rhasspy/piper/releases (e.g. `piper_<os>_<arch>.zip`)
2. Download a voice (.onnx + .onnx.json):
   ```bash
   wget -O ~/piper-voices/en_US-amy-medium.onnx \
     https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium/en_US-amy-medium.onnx
   wget -O ~/piper-voices/en_US-amy-medium.onnx.json \
     https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium/en_US-amy-medium.onnx.json
   ```
3. Set env var:
   ```bash
   export PIPER_BIN_PATH=/path/to/piper
   ```

## Local-first guarantee

Per CLAUDE.md hard rule #11, audio data must never leave the device unless `routesToCloud=true` is explicitly set on the policy. The provider's STT/TTS runs entirely against the local whisper/piper binaries — no network calls.

## Common operational issues

### "AUDIO.STT: 'whisper-cli' binary not runnable"

The provider runs `<binPath> --help` to verify before transcribing. If this fails:
- Check `WHISPER_CLI_PATH` points to the actual binary (not the `whisper.cpp` repo dir)
- On Linux, ensure executable bit: `chmod +x whisper-cli`

### "AUDIO.SYNTHESIZE: voice model not found"

Piper requires both `.onnx` and `.onnx.json` files in the same directory. Set `target.voicePath` to the `.onnx` file; piper auto-discovers the .json.

### "Transcription quality is poor"

Try a larger model — `ggml-base.en.bin` is fast but coarse. Better: `ggml-medium.en.bin` (~1.5 GB) or `ggml-large-v3.bin` (~3 GB). Set `WHISPER_MODEL_PATH` to point to it.

### "WAV file is corrupted / very long synthesis"

Piper appends silence between sentences (controlled by `--sentence_silence`). The provider uses defaults; for tighter output, edit the provider to pass `--sentence_silence 0.0`.

## Related documents

- [Capability Framework Runbook](runbook-capability-framework.md)
