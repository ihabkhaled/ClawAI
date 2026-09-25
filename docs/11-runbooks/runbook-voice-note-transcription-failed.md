# Runbook — a voice note cannot be transcribed

**Symptom:** the model answers "I couldn't transcribe your voice note", or the
file row's `extractionError` says the transcription service is busy /
unavailable / no model accepted the recording.

Rule: [rules/42](../../rules/42-attachment-understanding.md) item 20.
Mechanism: [skills/add-a-voice-note-or-transcription-path.md](../../skills/add-a-voice-note-or-transcription-path.md).

## 1. Read the walk in the file-service log

Production is read-only for diagnosis — `docker logs` and `SELECT` only.

```bash
ssh ClawAI 'docker logs --since 30m claw-file-service 2>&1 | grep -E "resolveAll|runCandidates|TranscriptionMeter"'
```

Each job prints, in order:

- `resolveAll: candidate N PROVIDER/model` — the ranked list (cached 60 s).
- `runCandidates: … kind=MODEL_REJECTED|RATE_LIMITED|QUOTA_EXHAUSTED — <raw provider message>`
  for every recoverable failure, or `… failed — <raw>` for a terminal one.
- a `reserve` / `release` pair per provider call (`requestId …:GEMINI`, then
  `…:GEMINI:2`). One reserve without its release or finalize is a leak — see
  [runbook-payg-credit.md](runbook-payg-credit.md).

## 2. Match what you see

| Log shows                                                              | Cause                                                 | Action                                                                                |
| ---------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| First candidate is a `preview` / `antigravity` / `image` / `tts` model | file-service older than 2026-09-25 — no ranking       | Deploy file-service                                                                   |
| `kind=MODEL_REJECTED` on every GEMINI model                            | Connector rows claim audio the models lack            | Check step 3; widen or narrow `isGeminiAudioCapableModel` only with a confirmed model |
| `kind=QUOTA_EXHAUSTED` on OPENAI                                       | The OpenAI key has no credit (`insufficient_quota`)   | Top up the key or disable the connector; waiting will not help                        |
| `kind=RATE_LIMITED` twice, then the next provider                      | Transient limit; the walk already did its one backoff | Nothing, unless it persists — then raise the provider's quota                         |
| `no audio-capable connector configured`                                | No GEMINI/OPENAI row claims audio after the heuristic | Enable a Gemini `flash` / `flash-lite` model or an OpenAI connector                   |
| `failed — …` (5xx, ECONNRESET, empty transcript)                       | Terminal; the walk stops on purpose                   | Provider outage, or a silent recording                                                |

## 3. Check the connector catalog (read-only)

```bash
ssh ClawAI 'docker exec claw-pg-connector sh -c "psql -U \$POSTGRES_USER -d \$POSTGRES_DB -c \"SELECT model_key, exposure, supports_audio, synced_at FROM connector_models WHERE provider = '"'"'GEMINI'"'"' AND supports_audio ORDER BY model_key\""'
```

A GEMINI row with `supports_audio = t` for a preview or non-`gemini` model
means the row predates the fail-closed heuristic (2026-09-24) — there is no
scheduled sync, only the admin **Sync models** button. connector-service's
snapshot applies the heuristic on read, so such a row no longer reaches
transcription or routing; an admin re-sync makes the stored column match.

## 4. Verify a fix

Upload a real voice note and confirm `file.transcribe_completed` carries a
character count that matches what was said, per
[rules/49](../../rules/49-qa-team-discipline-and-test-evidence.md). A
transcript nobody read is not evidence.

## Related: the answer begins with the model's own notes

If the reply to a voice note starts with text like "I already told them. Be
concise." that is a reasoning leak, not a transcription problem — see
[rules/56](../../rules/56-model-reasoning-never-in-the-answer.md).
