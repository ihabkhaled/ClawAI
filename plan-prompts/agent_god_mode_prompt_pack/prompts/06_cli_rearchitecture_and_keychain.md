# 06 — CLI Rearchitecture and Keychain Prompt

Redesign `agent-cli` from a minimal script into a serious product-grade CLI.

Current issues from the audit include:
- no real CLI framework
- manual arg dispatch
- no tests
- no login/logout/whoami/doctor
- plain-text config
- duplicated request helpers
- no daemon mode
- no auto-refresh
- no cancellation/streaming/timeouts

Design the new CLI with:
1. command architecture and directory structure
2. a real CLI framework choice
3. config and secret storage model
4. OS keychain integration
5. Linux headless fallback storage
6. retry and reconnect behavior
7. service/daemon mode options
8. upgrade/version checks
9. command list, at minimum:
   - login
   - logout
   - whoami
   - doctor
   - status
   - start
   - stop
   - tail
   - run
   - watch
   - devices
   - config get/set
10. telemetry and logging model
11. packaging strategy:
   - npm global
   - single binary
   - signed installer (future)
12. code-quality plan:
   - lint
   - unit tests
   - integration tests
   - CLI snapshot tests

Be explicit about modules, responsibilities, and migration from current `index.js`.
