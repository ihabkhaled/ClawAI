# 14 — Testing, TDD, Security, and Quality Prompt

Produce the full quality plan for the desktop agent initiative.

I want extremely high standards.

Cover:
1. TDD strategy for CLI, backend, frontend, and streaming flows
2. unit tests
3. integration tests
4. API tests
5. CLI command tests
6. browser-based UI tests
7. E2E tests across CLI + webapp + backend
8. security tests
9. auth abuse tests
10. refresh/reuse-detection tests
11. revoke tests
12. streaming reliability tests
13. performance/load tests
14. offline/reconnect/sleep-resume tests
15. cross-platform tests (macOS/Windows/Linux)
16. manual QA matrix
17. observability and alerting validation
18. release gates and definition of done

Explicitly include test scenarios for:
- login via browser
- login via device-code fallback
- successful refresh
- stolen refresh token reuse
- revoked device
- laptop sleep > 2 minutes
- huge stdout streaming
- command cancel
- dangerous command approval blocks
- scheduled jobs
- chat-driven local execution
- file upload/download
- browser automation safety

I want exact test case groups, tooling suggestions, coverage expectations, and merge/release gates.
