# Skill: verify the free local speech container (ADR-128)

Use when touching the `speech` service, `LOCAL_SPEECH_BASE_URL`, the LOCAL
transcription candidate or the LOCAL read-aloud voice.

1. The container is `ghcr.io/speaches-ai/speaches:0.8.3-cpu`, service `speech`
   in `docker/docker-compose.{dev,prod}.ollama.yml`, profile `local-ai`, port 8000,
   no published port. Without `CLAW_LOCAL_AI=true` it does not exist, and the
   `/health` probe correctly hides LOCAL.
2. **It does not pull models lazily.** An uninstalled model is a 404 "not installed
   locally". The compose entrypoint installs them with `POST /v1/models/{id}`; the
   ids there must equal `LOCAL_TRANSCRIPTION_MODEL` (file-service) and
   `LOCAL_TTS_MODEL` (chat-service).
3. Prove it on the `claw-network` (from a container or `docker exec`, model
   already installed):
   - `GET /health` returns `OK`.
   - `POST /v1/audio/speech` `{"input","model":"speaches-ai/Kokoro-82M-v1.0-ONNX","voice":"af_heart","response_format":"wav"}` returns `RIFF` bytes (mp3 and wav only; no opus/aac).
   - `POST /v1/audio/transcriptions` (multipart `file`, `model`, `response_format=verbose_json`) returns `{"text": ...}`.
4. Git Bash rewrites `/tmp/x` inside `docker exec`; `export MSYS_NO_PATHCONV=1`.
5. Unmetered because `LOCAL` is in `PAYG_EXEMPT_PROVIDERS`; never add it to a price table.
