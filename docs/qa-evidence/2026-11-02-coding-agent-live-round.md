# QA evidence - coding-agent-live-round

Batch: coding-agent-live-round
Date: 2026-11-02
Commits: (fill in after committing)
Verdict: PARTIAL

Headless CLI/SDK live round against the local dev stack https://claw.local (a local dev admin and a
throwaway free user; no production account, no outward-facing GitHub action). Raw evidence is under the
session scratchpad `batch3/`.

## Results

- Real agent runs, 4 of 4 PASS (create `add.js` with a wrong body and a test, see it fail, fix, rerun to
  PASS): `GEMINI/models/gemini-2.5-flash` (5 tool calls), `OLLAMA/kimi-k2.6` cloud connector (6),
  `ANTHROPIC/claude-haiku-4-5-20251001` (6, needed the admin account), `OLLAMA/glm-5.3-flash` (5, second
  try; the first hit the 300 s budget while backed off on 429s).
- MCP PASS: a local stdio echo server via `--mcp-config`; the agent listed and called its tool and returned
  the echoed marker.
- Sandbox PASS: `curl | sh` refused as download-and-run; a write outside the workspace refused; `rm -rf`
  outside the workspace denied; `workspace.command` allows only node, npm and npx; a file write to
  `../outside-escape.txt` refused and no file appeared. Not shown: a shell script actually running (a
  script that passes the screen is always put to approval, and a headless run cannot approve).
- GitHub read-only PASS: `gh pr list` on the extension repo. There is no PR tool in the agent's tool list,
  so the agent-side PR view/review/merge flows were NOT exercised. No repo creation, push, merge or
  comment was made.
- Real-editor office files PASS: see `2026-11-01-extract-text-office-documents.md` lane L08.

## Findings

- BUG, fixed in extension 1.110.0: a plan daily-limit 429 (`PLAN_DAILY_CHAT_LIMIT_EXCEEDED`) was reported as
  "rate limited, choose another model" and retried 4 times; the headless session also dropped the error
  code, so the code never reached the retry logic. Now one attempt and a message that names the cause.
- Docs mismatch, fixed: an outside-workspace write reads "denied by the write scope" when a write scope is
  active and "Path escapes the workspace" when none is.

## Open gaps

- Agent-side PR view/review/merge on a real PR (needs a PR tool and a sandbox repo).
- A shell script run under approval (needs an interactive approver).
- The VS Code panel shows the old rate-limit wording and does not show cache-write tokens.
