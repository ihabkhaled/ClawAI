# 09 — Streaming Terminal and Command Runtime Prompt

Transform the current buffered `exec` model into a powerful, safe, live runtime.

You must design:
1. switch from `exec` to `spawn`
2. stdout/stderr streaming
3. SSE vs WebSocket decision and justification
4. nginx changes for streaming
5. command timeout model
6. cancel/kill model
7. command status transitions
8. output persistence strategy
9. truncation rules and artifact storage
10. live terminal UI using structured stream events
11. security boundaries for long-running commands
12. how this interacts with chat

Also add:
- one-shot commands
- multi-step scripts
- scheduled commands
- working-directory controls
- environment variable injection rules
- shell selection per OS
- output metadata (start/end, duration, signal, exit code)

Testing must include:
- fast command
- long-running command
- huge output
- partial failure
- cancel midway
- timeout
- stream disconnect and reconnect
