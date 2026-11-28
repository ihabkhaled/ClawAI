# Coding agent capability inventory, late 2026 (ClawAI gap research)

Date of research: 2026-11-28. Gathered by a read-only research agent; every claim carries its source. Plan built on it: [self-healing-coding-agent-plan.md](self-healing-coding-agent-plan.md).

Method: official docs first (code.claude.com, learn.chatgpt.com (OpenAI Codex docs, which redirect from developers.openai.com), docs.sentry.io, docs.github.com, cursor.com/docs/cloud-agent, antigravity.google/docs). Blogs and search snippets second. Anything not read on a fetched page is marked UNCONFIRMED. Search-snippet-only facts are marked SNIPPET.

Fetch notes:

- cursor.com/docs/bugbot.md returned HTTP 404. Bugbot facts are SNIPPET-level only.
- Claude Code hooks, scheduled tasks and ultrareview pages were read in part; the full hooks event list is in the hooks reference (code.claude.com/docs/en/hooks.md), which was not fetched.
- Claude Code MCP, chrome, computer-use, memory pages exist in the docs map but were NOT fetched. Their details are UNCONFIRMED.

---

## 1. Claude Code (Anthropic)

Docs map: https://code.claude.com/docs/en/claude_code_docs_map.md

- **Hooks**: user shell commands at lifecycle points. Events seen in the guide include `PreToolUse`, `PostToolUse`, `Notification`, `SessionStart`, `PermissionRequest`, `CwdChanged`, `FileChanged`, `WorktreeCreate`, `WorktreeRemove`. Handler types include command, prompt-based and agent-based. Full list and MCP-tool hooks: https://code.claude.com/docs/en/hooks-guide.md and https://code.claude.com/docs/en/hooks.md (the reference was not fetched; exact event list beyond these names is UNCONFIRMED).
- **Plugins**: bundle skills, hooks, subagents and MCP servers into one installable unit. Pages: https://code.claude.com/docs/en/plugins/overview.md, https://code.claude.com/docs/en/plugins/security.md, https://code.claude.com/docs/en/plugins/anthropic-marketplaces.md.
- **Skills**: https://code.claude.com/docs/en/skills.md. A skill can run as a forked subagent (`context: fork`). Pre-approved tools via `allowed-tools` frontmatter.
- **Subagents**: Markdown files with YAML frontmatter (https://code.claude.com/docs/en/sub-agents.md). Fields include `tools`, `disallowedTools`, `model` (sonnet, opus, haiku, fable, full ID, inherit), `permissionMode`, `isolation: worktree`, `background`, `memory` (user/project/local), `skills`, `maxTurns`, `effort`, `mcpServers`, `hooks`. Built-in types: Explore (read-only), Plan, general-purpose, claude, statusline-setup, claude-code-guide, web-fetch. Subagents can spawn subagents up to 3 layers by default. Up to 20 run concurrently by default.
- **Worktrees**: `claude --worktree <name>` creates `.claude/worktrees/<name>/` on branch `worktree-<name>`. Subagents can use `isolation: worktree`. `.worktreeinclude` copies gitignored files such as `.env`. Enforces that edits and git commands stay in the worktree while a session is isolated. Sweeps stale subagent and background worktrees after `cleanupPeriodDays`. Source: https://code.claude.com/docs/en/worktrees.md
- **Background tasks**: background subagents run concurrently; permission prompts surface in the main session. Source: sub-agents page above. Background sessions: https://code.claude.com/docs/en/agent-view.md (named in docs map, not fetched).
- **Checkpoints and rewind**: every prompt that starts a turn creates a checkpoint. Keeps file snapshots for the 100 most recent checkpoints. `/rewind` (alias `/undo`, or double Esc) offers restore code and conversation, restore conversation, restore code, summarize from here, summarize up to here. Limits: Bash-only file changes are not tracked once Claude has edited that file; subagent edits are usually not restored (except foreground forked skills); symlinks and hard links are skipped; external edits not tracked. Source: https://code.claude.com/docs/en/checkpointing.md
- **Permission modes**: `default` (alias `manual`), `acceptEdits`, `plan`, `auto` (a classifier model reviews actions before they run and blocks risky ones), `dontAsk` (prompting tools denied), `bypassPermissions` (documented for isolated environments only). Source: https://code.claude.com/docs/en/permission-modes.md
- **Sandboxing**: the built-in Bash sandbox is available on macOS, Linux and WSL2. The OS limits which paths Bash can write. Sandboxed commands have no network by default; per-command allowed domains open specific hosts. By default a sandboxed command can be retried outside the sandbox; strict mode turns that off. Source: permission-modes page above. Sandbox page https://code.claude.com/docs/en/sandboxing.md is linked but was not fetched.
- **MCP**: https://code.claude.com/docs/en/mcp.md (not fetched; details UNCONFIRMED beyond the existence of the page).
- **Browser**: Claude in Chrome page https://code.claude.com/docs/en/chrome.md exists (not fetched; details UNCONFIRMED).
- **Computer use**: https://code.claude.com/docs/en/computer-use.md exists (not fetched; details UNCONFIRMED).
- **Memory**: https://code.claude.com/docs/en/memory.md exists (not fetched; details UNCONFIRMED).
- **Scheduled tasks (formerly routines)**: cloud tasks that run on Anthropic infrastructure, or on a self-hosted environment. Triggers: schedule (hourly, nightly, weekly, or once), API (HTTP POST with bearer token to a per-task endpoint), GitHub events (PRs, releases). Triggers can combine. Research preview. Available on Pro, Max, Ultra, Team, Enterprise. Source: https://code.claude.com/docs/en/scheduled-tasks.md
- **GitHub integration, two products**:
  - Claude Code GitHub Action (`anthropics/claude-code-action@v1`): `@claude` mentions in issues, PR comments and PR reviews. Automation mode when a `prompt` is given, on any event including cron. Can commit and push, open PRs, and post comments. Write access is required for the triggering user; bots are rejected unless listed in `allowed_bots`. Uses the Claude GitHub App with Contents, Issues, Pull requests read and write, plus a broader shared permission set. Source: https://code.claude.com/docs/en/github-actions.md
  - Code Review (Team and Enterprise only): several agents read each PR in parallel, a verification step drops false positives, findings are ranked by severity, and results are posted as inline comments plus a check run named "Claude Code Review". Read-only access in the review; the review does not push commits. Triggers: on PR open, after every push, or only on request (`@claude review`). Review levels Quick, Standard, Deep. Customized with `REVIEW.md` from the base or default branch. Not available with ZDR or HIPAA or CMEK. Sources: https://code.claude.com/docs/en/code-review.md and the pages it links (code-review-pull-requests, code-review-customize, code-review-costs).
  - CI-fix: the docs say `actions: read` lets Claude read CI results on PRs. A dedicated "fix failing CI" loop was NOT confirmed in the pages read. Auto-fix for PRs exists in cloud sessions ("auto-fix pull requests" link in the GitHub App permissions section). Details UNCONFIRMED.
- **Ultrareview (`/code-review ultra`)**: a cloud review run by a fleet of reviewer agents in a cloud sandbox. Every reported finding is independently reproduced and verified. Takes about 5 to 15 minutes. Can target a branch, a base, or a PR; can post findings to the PR as one plain comment from the user's account (`--post`, not a review or approval). Billing: 3 free runs per account (Pro, Max, Ultra), then usage credits, typically $5 to $25 per review. Not available on Bedrock, Vertex, Foundry, ZDR, HIPAA or CMEK (falls back to a local review). Diff limit by default 500 files and 8,000 changed lines. Non-interactive: `claude ultrareview` with `--json`, `--timeout`, `--post`, `--trust-workspace`. Source: https://code.claude.com/docs/en/ultrareview.md
- **Headless and SDK**: https://code.claude.com/docs/en/headless.md and the Agent SDK (linked from the GitHub Action page). Not fetched in detail.

## 2. OpenAI Codex (CLI, IDE extension, cloud)

Official approvals and sandbox page (redirected from developers.openai.com): https://learn.chatgpt.com/docs/agent-approvals-security.md

- **Sandbox modes**: `read-only` (no edits, commands allowed within the read-only sandbox); `workspace-write` (edit and run in the workspace, network off by default); `danger-full-access` (no sandbox, no approval prompts, flag `--dangerously-bypass-approvals-and-sandbox`, alias `--yolo`; the page does not recommend it). Protected paths stay read-only even in workspace-write: `.git`, `.agents`, `.codex`, `.aws`.
- **Approval policies**: `on-request` (asks before actions outside the sandbox, such as editing outside the workspace or network commands); `never`; `granular` (per-category prompts: `sandbox_approval`, `rules`, `mcp_elicitations`, `request_permissions`, `skill_approval`); `untrusted` is retired and can stop Codex from starting.
- **Auto preset**: `workspace-write` with `on-request`. Recommended on launch for version-controlled folders.
- **Network**: off by default in workspace-write; enabled with `[sandbox_workspace_write] network_access = true`. A `network_proxy` feature enforces domain rules on command subprocesses: allowlist-first, `deny` overrides `allow`, `*.example.com` matches subdomains only, `**.example.com` matches the apex too. `allow_local_binding = false` blocks loopback, link-local and private destinations. DNS checks are best-effort. The proxy does not filter web search, app or MCP connections, browser activity or Codex's model requests.
- **Web search modes**: `cached` (default), `live`, `indexed`, `disabled`.
- **Auto-review**: `approvals_reviewer = "auto_review"` routes eligible approval requests (sandbox escalations, network requests, app or MCP tool calls) to a reviewer agent. Allows low and medium risk, denies critical, requires user authorization for high risk. Fails closed on errors and timeouts. Uses extra model calls. Admins can restrict reviewers.
- **Security guidance on the page**: treat web results as untrusted; dev containers do not protect against a malicious project running with full access; keep `log_user_prompt = false` in OpenTelemetry; work on a feature branch and review Codex changes like any PR.
- **Cloud tasks**: https://learn.chatgpt.com/docs/cloud (redirect from developers.openai.com/codex/cloud). Each task has its own workspace and can keep running while the computer sleeps. Environments can be published and reused. Network access: public internet, package-manager domains only, or an allowlist. HTTP secrets are supplied for HTTPS services; the page warns that saving an HTTP secret also allows access to its domains. Environment variables and access control are supported. After Codex finishes you can review, request changes, commit, or open a PR. The page does not cover the code-review feature, AGENTS.md, or multi-agent/subagents (UNCONFIRMED from this page).
- **Secrets during setup (SNIPPET from an earlier search of Codex docs)**: setup runs with network access for installs; secrets are removed before the agent phase. Source: the same cloud environment docs, search snippet only.
- **AGENTS.md**: UNCONFIRMED from an official page in this session (the only source was a third-party guide).
- **Code review bot**: UNCONFIRMED (no official page read).
- **Multi-agent / subagents**: UNCONFIRMED (a "Subagents" link exists in the nav; the page was not read).

## 3. Cursor

- **Background / Cloud Agents** (renamed from background agents): https://cursor.com/docs/cloud-agent
  - Runs in isolated cloud VMs with cloned repos, installed deps, secrets, startup commands, network access.
  - Works on a separate branch and pushes for handoff. In multi-repo environments it can open a PR per repo.
  - Computer use and browser: controls desktop and browser; produces screenshots, videos and logs as artifacts; teammates can take remote desktop control.
  - MCP: HTTP and stdio transports, OAuth where required; a built-in Cursor Cloud MCP gives run diagnostics.
  - Hooks: `.cursor/hooks.json` (command hooks that run in the cloud). Environment: `.cursor/environment.json` (Dockerfile-based).
  - Model selection: a curated set of models; context-window size selectable for supported models.
  - Memories, rules (`.cursor/rules`) and AGENTS.md: NOT mentioned on that page. Rules/memories in general are UNCONFIRMED in this session.
- **Bugbot** (automatic PR review; Autofix):
  - cursor.com/docs/bugbot.md returned HTTP 404 in this session. Facts below are SNIPPET-level from the Bugbot Autofix blog and changelog: https://cursor.com/blog/bugbot-autofix and https://cursor.com/changelog/02-26-26
  - Autofix runs cloud agents in separate VMs to test a fix, proposes the fix on the PR; a preview comment can be applied with an `@cursor` command; can be set to push straight to the branch. Cursor reports over 35% of Autofix changes merged into the base PR (vendor claim).
  - Repo config file can lower the Autofix mode but not raise it (SNIPPET, from search of the Bugbot docs).
  - Setting Autofix to Off stops cloud agents and their cost (SNIPPET, community forum answer; treat as UNCONFIRMED).
- **Multi-model**: UNCONFIRMED in this session (not researched).
- **Browser tool in the IDE**: UNCONFIRMED.

## 4. Google Antigravity

- Sources: https://developers.googleblog.com/en/build-with-google-antigravity-our-new-agentic-development-platform/ and https://www.antigravity.google/docs/artifacts
- **Agent Manager**: spawns, orchestrates and observes multiple agents working asynchronously across workspaces; the review surface is per delegated task rather than per diff (SNIPPET from a conference talk summary; the Google blog confirms the spawn/orchestrate/observe purpose).
- **Artifacts**: rich Markdown implementation plans, code diffs, architecture diagrams, images, browser recordings. Inline text feedback on an artifact steers the agent before it edits local files. Depending on config the agent pauses at milestones for review. Interactive HTML widgets via `/generative_ui`. Source: artifacts page above.
- **Checkpoint/undo**: a third-party guide mentions "Undo changes up to this point" on artifacts (SNIPPET, UNCONFIRMED on the official page; the artifacts page does not describe it).
- **Browser agent**: opens URLs, reads pages, interacts. Uses the same authentication as your normal Chrome (a blue border shows agent control; SNIPPET from talk summary). A JavaScript-execution policy with options to proceed automatically, request review, or disable it, with "Always Proceed" the most exposed (SNIPPET; the official page links to "Browser use" and "Allowlist and denylist" pages, not read).
- **Multi-agent**: yes, via Agent Manager (see above).

## 5. Self-healing and auto-fix products

### 5a. Sentry Seer Autofix

Source: https://docs.sentry.io/product/ai-in-sentry/seer/autofix

- Three stages: root cause, solution, code generation (patch). Live stream of reasoning shown.
- **Triggers**: manual from the Issue Details page; automatic when project automation is on and the issue has 10+ events, occurred in the last 14 days, and has a sufficient fixability score from Sentry's ML model. Automation can be capped per project at Root Cause, Plan, or PR Drafted.
- **Data used**: issue details (error messages, stack traces, event metadata), distributed traces and spans, logs (beta), profiles, performance metrics, Sentry docs, linked repository code, and interactive feedback.
- **Repos**: connected via GitHub or GitLab integration (GitHub.com and GitLab.com cloud only). Customizable per repo, with a default-branch override.
- **PR creation**: optional. Organizations can disable code generation entirely, which removes the Create PR button and stops PR creation and pushes.
- **Hand-off**: can delegate implementation to Claude Agent, Cursor Cloud Agent, or GitHub Copilot Cloud Agent (GitHub only).
- **Iteration**: feedback via the Autofix panel or `@sentry` PR comments (write access required). Auto-Iterate on PRs tries to fix failing CI checks, with limited attempts. Responds to human and bot reviewers (bot reviews must have inline comments). PR iteration is GitHub only; Seer does not answer broader questions during it.
- **Billing**: active-contributor pricing now; usage-based credits via a Seer Wallet from 2026-12-08 (page banner).
- **Untrusted content**: the page does NOT say how untrusted issue or log content is handled and does NOT mention prompt injection. UNCONFIRMED.
- **Webhook authentication and rate limits**: the official Seer webhooks page exists (https://docs.sentry.io/organization/integrations/integration-platform/webhooks/seer) but was not fetched. A search snippet names the header `Sentry-Hook-Signature` (SNIPPET); another source names a different header; treat exact header as UNCONFIRMED. No Sentry-specific rate limit on inbound webhooks was found (UNCONFIRMED). Sentry's API rate-limit docs cover outbound API calls only (https://docs.sentry.io/api/ratelimits, SNIPPET).

### 5b. GitHub Copilot cloud agent (autofix and coding agent)

Sources: https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent and https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/risks-and-mitigations

- **Entry points**: Copilot home, Copilot panel in a file/issue/PR, dashboard, and the Agents tab or panel in a repo. Code-scanning alerts can be assigned to Copilot for fixes (security campaigns). Issue assignment to Copilot is documented in community/other pages (SNIPPET; not on the page fetched).
- **Where it runs**: GitHub Actions-based environment (59-minute maximum for those sessions). Newer "cloud sandboxes" can span multiple repos in one org.
- **Custom instructions, agent skills, MCP servers**: supported for delegated tasks. `copilot-instructions.md` / `AGENTS.md` NOT mentioned on the page (UNCONFIRMED).
- **Mitigations documented (fetched page)**:
  - Hidden characters filtered before input reaches the agent.
  - Text inside an HTML comment in an issue or PR comment is not passed to the agent.
  - Internet access restricted by a firewall.
  - Commits signed and shown as "Verified".
  - CodeQL for security issues and secret scanning, optionally disabled. Whether CodeQL runs automatically on the agent's own changes is not stated (UNCONFIRMED).
  - Agent can push to one branch only and is subject to branch protections and required checks.
  - Draft PRs must be reviewed and merged by a human; the agent cannot mark its own PR ready, approve it, or merge it.
- **Known attacks (research, not GitHub's own text)**: see section 7.
- **Code review of PRs**: Copilot code review reviews on request or when automatic review is configured. Billed via AI Credits; private-repo reviews consume Actions minutes from June 1, 2026 (SNIPPET from a search result; UNCONFIRMED against a GitHub billing page).

### 5c. Cursor Bugbot Autofix and Claude Code Code Review

Covered in sections 1 and 3. Summary: Bugbot Autofix proposes or pushes fixes from cloud VMs; Claude Code Code Review reviews and posts findings but does not push commits (its docs say reviews are read-only for repo access).

### 5d. Error report to ticket to reproduce to fix PR pipelines: summary

- Sentry Seer: error to root cause to code patch to PR, with stopping-point cap and per-project automation thresholds. Strong.
- Copilot: issue or alert to PR; human gate required.
- Cursor Bugbot: PR bug to fix proposal or push.
- Claude Code GitHub Action: `@claude` or a scheduled or event prompt to a commit or PR; CI-result reading via `actions: read`.
- Nothing above was confirmed as a generic "error report webhook from an arbitrary client" intake with signing, rate limits and abuse handling. Sentry's is the closest and its details are partly UNCONFIRMED.

## 6. Multi-model review and debate

- **Claude Code Ultrareview**: several reviewer agents in a cloud sandbox; each finding independently reproduced and verified. Billed as 3 free runs per account, then usage credits (about $5 to $25). Source: https://code.claude.com/docs/en/ultrareview.md. Note: this is one model family, not a cross-vendor council.
- **Claude Code Code Review**: several agents in parallel, then a verification step filters false positives. Billed per review, costs depend on review level and the cost page (https://code.claude.com/docs/en/code-review-costs.md, not fetched). Team and Enterprise only.
- **Open-source "council" tools (SNIPPET, from search, not vendor pricing)**:
  - Code Council (klitchevo): sends code to several models via OpenRouter in parallel and shows agreement and disagreement; roughly $0.01 to $0.05 per review with cost-oriented defaults, $0.10 to $0.30 with stronger models. Source: https://mcpservers.org/en/servers/klitchevo/code-council
  - Kirat Multi Model AI Council: Claude Code plugin adding ChatGPT and Gemini as council members; bring your own API keys. Price not found. Source: https://mcpservers.org/servers/kirat-ai
  - Mozilla.ai "Star Chamber": multi-LLM consensus for code quality. Source: https://blog.mozilla.ai/the-star-chamber-multi-llm-consensus-for-code-quality/
  - Indie report: a multi-model reviewer at about $0.30 per run, motivated by blind spots correlating within a model family (SNIPPET, indiehackers).
- **Billing pattern observed**: free runs or usage credits (Anthropic); per-review metered cost (open-source via OpenRouter, BYOK); seat or AI-credit based (GitHub). Cross-vendor council inside a first-party product was NOT found.

## 7. Security research: prompt injection against coding agents

Attacks, with what each shows:

- **Trail of Bits (Aug 2025)**: https://blog.trailofbits.com/2025/08/06/prompt-injection-engineering-for-attackers-exploiting-github-copilot/
  - Delivery: a public GitHub issue that looks like a feature request (Spanish and French support).
  - Concealment: payload inside an HTML `<picture>` tag, hidden from the GitHub UI but visible to the LLM. Fake "encoding artifact" warnings. A fake `<human_chat_interruption>` block with a scripted agreement.
  - Action: when a maintainer assigns the issue to Copilot, the agent added a dependency whose lock entry pointed to a malicious wheel and ran a remote script fetched with curl piped to sh from a host on Copilot's default firewall allowlist, hiding it from the PR description. After merge and deploy, a backdoor executed commands from an HTTP header.
  - The article has no mitigations section (fetched page).
- **Orca Security, RoguePilot (Feb 2026)**: https://thehackernews.com/2026/02/roguepilot-flaw-in-github-codespaces.html (SNIPPET from search). A malicious GitHub issue can trigger a passive prompt injection when a user launches a Codespace from that issue.
- **BeyondTrust**: a single hidden comment on a GitHub issue can give an attacker control of the Copilot coding agent (SNIPPET): https://www.beyondtrust.com/blog/entry/github-copilot-hidden-prompt-injection-agent-takeover
- **Adversa AI (Oct 2026, reported by CyberSecurityNews, SNIPPET)**: encrypted "cryptographic context injection" hides instructions that normal checks miss; the same plaintext was refused. https://cybersecuritynews.com/github-copilot-cli-vulnerability/
- **Client evaluation (arXiv 2603.21642)**: seven MCP clients including Claude Code and Cursor; client-side MCP security judged inadequate. Claude Desktop had strong guardrails; Cursor highly susceptible to cross-tool poisoning and unauthorized tool calls. https://arxiv.org/html/2603.21642 (numbers from the paper's abstract; not re-checked against the full paper).
- **CSA whitepaper and research note (2026, secondary)**: over one in three tool-poisoning attempts succeeded in one study; highest measured 72.8% against o1-mini. Treat as secondary. https://labs.cloudsecurityalliance.org/wp-content/uploads/2026/05/CSA_whitepaper_mcp_security_tool_poisoning_20260506-csa-styled.pdf
- **CVE-2025-53773 (SNIPPET via CSA)**: hidden prompt injection in PR descriptions achieved RCE through GitHub Copilot.
- **MCPoison (CVE-2025-54136, SNIPPET via CSA)**: one committed config file enabled team-wide compromise.

Mitigations, with the source for each:

1. Hidden-content stripping before the model reads input: GitHub filters hidden characters and removes HTML comments from issue and PR comments (Copilot risks page). Limit: Trail of Bits hid the payload in an HTML `<picture>` tag, so stripping must cover all markup, not comments only.
2. Network egress allowlist with deny-overrides and no local or private destinations: Codex `network_proxy` (https://learn.chatgpt.com/docs/agent-approvals-security.md); Copilot firewall (Copilot risks page). Limit: Trail of Bits fetched from a host on Copilot's allowlist, so an allowlist must not include hosts that serve attacker-controlled content or package hosts that can run scripts.
3. OS-level sandbox with protected paths read-only: Codex protects `.git`, `.agents`, `.codex`, `.aws` in workspace-write (approvals page); Claude Code sandbox limits Bash writes at the OS level and blocks network by default (permission-modes page). Codex removes setup secrets before the agent phase (SNIPPET).
4. Human gate on write and merge, with the agent unable to approve or merge: Copilot cloud agent cannot mark PRs ready, approve, or merge; branch protections and required checks apply; commits signed (Copilot risks page). Claude Code Code Review does not push commits (code-review page).
5. Treat tool and MCP output as data, pin tool metadata, and scan it: GitHub and ClawAI-style "untrusted" marking (ClawAI TOOLS.md already marks workspace.web and workspace.pr results as untrusted); CSA-summarized Microsoft June 2026 guidance treats a tool-description change like a dependency update, scans metadata for embedded instructions, scopes tools per session (SNIPPET via CSA, secondary). Keyword filtering alone is brittle (DEV article, low-quality source).

- Also: Codex says dev containers do not protect against a malicious project running with full access, so use them only with trusted repos (approvals page).

---

## 8. ClawAI comparison (read-only, from local docs)

Local sources read:

- D:\Freelance\Claw\apps\claw-coding-agent\docs\TOOLS.md (generated tool list; 16 tool families)
- D:\Freelance\Claw\apps\claw-coding-agent\docs\ROADMAP.md (status at 1.84.0)
- D:\Freelance\Claw\apps\claw-coding-agent\docs\parity\PARTIAL_REMAINDERS.md

What ClawAI already has (from the docs):

- File, command, git (with hooks), notes, plan, gates, shell (off by default), HTTP (allowlisted hosts), browser (headless Chromium, allowlisted hosts), vision, MCP (OAuth, policy), knowledge context (repo rules), PR view/review/merge via gh (manual), research web search and fetch, sub-agent teams with worktree isolation (TOOLS.md, `agent.team`).
- ROADMAP 1.81 to 1.84: scheduler, session worktrees, agent mailbox, background commands, notebook execution, saved workflows, MCP with OAuth, plugins, SDK, headless CLI, rewind, deferred tools, sandbox, PRs and review, remote and channels, prompt routines, cross-window mailbox, plugin signatures.
- Untrusted marking of all tool results and redaction (TOOLS.md).

Known gaps from ClawAI's own docs:

- F030 Computer use: desktop-wide input deferred (decision). Browser click, type, screenshot to vision done.
- F067 panel placement: engine floor.
- F081 plugin marketplaces: backend.
- F093 prompt caching: live proof pending.
- F095 resume cloud sessions: backend.
- F097 mobile: no native app.
- F098 cloud coding sessions: hosted runners, clone, teardown missing; current sandbox runner is a worker-thread dry run.
- F099 routines: cron and repo-event triggers and per-routine secret isolation missing; only `intervalMinutes`.
- F100 self-hosted runners: attestation, isolation, update channel, org policy missing.
- F101 JetBrains, Desktop: not started; GitHub, GitLab, Slack done.
- F108 cost in runtime events: backend.
- ROADMAP "Not yet proven": sandbox mechanisms on real Linux, macOS, Docker hosts have unit coverage only; real MCP servers, Jupyter, gh flows unit tests only.

---

## Gaps vs ClawAI

Ranked by user value. "Competitor" names the product that has it (with the source above). "How we lack it" cites our own doc.

| #   | Capability                                                                                                   | Competitor(s)                                                                                                                    | How we lack it                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Automatic PR review on open and push, with inline comments and a check run                                   | Claude Code Code Review (code-review.md); Copilot code review; Cursor Bugbot                                                     | TOOLS.md `workspace.pr` is manual (view, review, merge on request). No event trigger documented.                                               |
| 2   | Verification of each reported finding before it is shown (reproduce or check)                                | Claude ultrareview (reproduces and verifies each finding); Code Review (verification step)                                       | No verification stage documented for review output.                                                                                            |
| 3   | Cloud agent that keeps running when the laptop is closed, with PRs out                                       | Codex cloud (learn.chatgpt.com/docs/cloud); Cursor Cloud Agents; Copilot cloud agent; Claude scheduled tasks                     | F098 cloud coding sessions blocked on backend (PARTIAL_REMAINDERS). Current sandbox runner is a dry run.                                       |
| 4   | Scheduled and trigger-based runs (cron, API token endpoint, GitHub events), with per-task secrets            | Claude scheduled tasks (scheduled-tasks.md)                                                                                      | F099: only `intervalMinutes`; no cron or repo-event trigger, no per-routine secret isolation.                                                  |
| 5   | CI-failure watch and fix loop on a PR (retries limited)                                                      | Sentry Seer Auto-Iterate (seer/autofix); Copilot cloud agent; Bugbot Autofix; Claude GitHub Action reads CI with `actions: read` | No CI-watch loop documented in TOOLS.md or ROADMAP. `code.gates` runs gates locally only.                                                      |
| 6   | Error report to root-cause to PR pipeline, with a stopping-point cap per project                             | Sentry Seer Autofix (automation caps at Root Cause, Plan, or PR Drafted; 10+ events, 14-day window, fixability score)            | Not in ClawAI docs. Would need signed intake, rate limits, dedupe, abuse handling (Sentry's own intake details UNCONFIRMED).                   |
| 7   | Start a run from an issue assignment or @mention in GitHub                                                   | Claude GitHub Action (`@claude`, `prompt` automation mode); Copilot (assign issue, per Trail of Bits); Codex cloud               | Not documented.                                                                                                                                |
| 8   | OS-level sandbox for shell commands, with network off by default and write-path limits                       | Claude Code sandbox (macOS, Linux, WSL2; permission-modes page); Codex workspace-write with network proxy                        | `workspace.shell` is "a safety net, not a sandbox" (TOOLS.md). Sandbox (1.82) has unit coverage only (ROADMAP "Not yet proven").               |
| 9   | Auto permission mode where a classifier reviews each action and fails closed                                 | Claude `auto` mode (permission-modes page); Codex `auto_review` (approvals page)                                                 | ClawAI modes are plan, ask, accept-edits, autonomous-scoped, strict (TOOLS.md). No classifier-reviewer mode documented.                        |
| 10  | User-authored subagent files (tools allowlist, model, `isolation: worktree`, memory, maxTurns, skills)       | Claude Code subagents (sub-agents.md)                                                                                            | `agent.team` is runtime spawn only (TOOLS.md). No file-defined subagent documented.                                                            |
| 11  | Lifecycle hooks with several event types and handler types (command, prompt, agent)                          | Claude Code hooks (hooks-guide.md, hooks.md)                                                                                     | UNCONFIRMED whether ClawAI exposes user hooks to the agent; ROADMAP mentions ADR 0007 "secure-by-default plugins, hooks, network" in progress. |
| 12  | Browser that uses the user's real signed-in Chrome                                                           | Antigravity browser agent (uses your Chrome auth; SNIPPET); Claude in Chrome (chrome.md, not fetched)                            | `browser.page` is a headless Chromium (TOOLS.md). Sign-in only via allowlisted hosts.                                                          |
| 13  | Desktop computer use                                                                                         | Cursor Cloud Agents (computer use with recordings); Claude computer-use.md (not fetched)                                         | F030 deferred pending decision (PARTIAL_REMAINDERS).                                                                                           |
| 14  | Strip hidden content (HTML comments, hidden characters) from issues and comments before the model reads them | GitHub Copilot cloud agent (risks page)                                                                                          | ClawAI marks PR and web text as data (TOOLS.md) but no documented hidden-content stripping. UNCONFIRMED if our pipeline strips it.             |
| 15  | Reviewer policy file for a repo (review focus, severity, what to ignore)                                     | Claude Code `REVIEW.md` (code-review-customize.md); Bugbot rules config (SNIPPET)                                                | `knowledge.context` reads rules and docs (TOOLS.md) but no review-specific policy file is documented.                                          |

Lower-ranked gaps, not in the top 15:

- Signed agent commits shown as Verified: Copilot cloud agent (risks page). ClawAI: UNCONFIRMED.
- Multi-model council for the agent's own diff: open-source Code Council and Star Chamber (SNIPPET). ClawAI has compare and judge model UX (ROADMAP). Partial parity, not a true council.
- Plugin marketplaces served by the backend: F081 blocked; Claude plugin marketplaces (plugins page).
- Remote and mobile handoff: F097 blocked; Cursor remote desktop control.

## Top 5 prompt-injection mitigations (summary)

1. Strip or refuse hidden content (HTML comments, hidden characters, markup) before the model reads issues and comments. (GitHub Copilot risks page; Trail of Bits shows markup-hidden payloads.)
2. Default-deny network egress with a domain allowlist; deny overrides allow; block link-local, private and loopback targets. (Codex network_proxy, approvals page.)
3. OS-level sandbox with read-only protected paths (`.git`, `.codex`, `.aws`) and no network by default. (Codex approvals page; Claude sandboxing via permission-modes page.)
4. Human gate on merge and approval; the agent cannot approve or merge its own PR; branch protections and signed commits. (Copilot risks page; Claude Code Code Review reads only.)
5. Treat tool and MCP metadata as code: pin, scan for embedded instructions, scope per session. (CSA summary of Microsoft June 2026 guidance, secondary; arXiv 2603.21642 on weak client defenses.)
