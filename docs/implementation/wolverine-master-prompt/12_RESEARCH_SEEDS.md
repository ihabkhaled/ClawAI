# 12 — Starting research sources (public documentation)

Initial public-source scan: 2026-11-28. These are starting points, not proof of full parity, exhaustive tool counts or private implementation. Revalidate versions, feature availability, license and URLs during execution. Record exact evidence and dated observations. No source code from proprietary products is included in this package.

- Claude Code settings and precedence: https://code.claude.com/docs/en/settings — documented settings, permissions, hooks, project guidance; investigate official tools, sandbox, subagents, skills, plugins and MCP sections.
- Claude Code user FAQ: https://support.claude.com/en/articles/14554922-claude-code-user-faq — public feature descriptions, reusable skills and integration patterns.
- Codex open repository: https://github.com/openai/codex — inspect current tagged release, tool implementations, CLI configuration, permission and sandbox behavior, subject to license review.
- Codex harness platform: https://developers.openai.com/blog/codex-as-a-platform — public description of app-server and responsibility boundaries.
- OpenAI sandbox guidance: https://developers.openai.com/api/docs/guides/agents-api/environments/security — sandbox and network/secrets considerations.
- Cursor agent: https://cursor.com/docs/agent/overview — agent capabilities and model orchestration overview.
- Cursor browser: https://cursor.com/docs/agent/tools/browser — browser tool/UI testing patterns.
- Cursor CLI: https://cursor.com/docs/cli/using — terminal use and project instructions.
- Antigravity overview: https://antigravity.google/docs/ide/overview/ — public agent surfaces, artifacts and workflows.
- Antigravity browser: https://antigravity.google/docs/browser — browser agent and interaction restrictions.
- Antigravity guardrails: https://antigravity.google/docs/learn/verification-and-guardrails — review/sandbox patterns.
- OWASP Agentic Applications risks: https://genai.owasp.org/agentic-applications-2026/ — agentic threat taxonomy.
- OWASP tool misuse: https://genai.owasp.org/agentic-applications-2026/asi02-tool-misuse-and-exploitation/ — tool authorization and misuse risks.
- OWASP prompt injection overview: https://genai.owasp.org/glossary/prompt-injection/ — untrusted inputs and indirect attacks.
- GitHub artifact attestations: https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations — artifact provenance and verification.
- OpenTelemetry: https://opentelemetry.io/docs/specs/semconv/ — conventions, including links to current GenAI conventions.

Additional official research targets to verify: Playwright browser projects and devices; VS Code extension host/webview security and publishing; GitHub Actions security, rulesets and environment protection; NIST SSDF and AI RMF; OWASP API Security/ASVS; SLSA provenance; MCP authorization/security; Docker rootless and sandbox isolation; OpenSSH host identity and Git credential management; provider-specific tool/stream semantics. Identify alternatives, tradeoffs, current advisories, upgrade paths, and test coverage. Do not use public attack demonstrations against third parties.
