> **Provenance.** Owner-supplied specification, received 2026-11-28 as a zip ("ClawAI Coding Agent Wolverine Master Prompt", written by another AI model at the owner's request). Stored unchanged except this note; the concatenated `FULL_MASTER_PROMPT.txt` was left out because it repeats files 00-12. How it is applied, and where it deviates: [`../self-healing-coding-agent-plan.md`](../self-healing-coding-agent-plan.md).

# ClawAI Coding Agent: master execution package

Open `FULL_MASTER_PROMPT.txt` and give the entire file to your authorized coding agent in the ClawAI workspace. Alternatively, extract all files and send this single instruction:

> Read 00_MASTER_PROMPT.md and every numbered workstream 01–12 in this directory. Treat them as one specification. Begin with the existing backlog and both repository baselines, then execute the phases in dependency order. Preserve evidence and enforce security/approval gates. Do not stop at a plan unless a genuine hard gate prevents further safe implementation.

The full TXT is the concatenated specification for easy copy/paste. The separate Markdown files allow staged execution without losing requirements. This is an implementation prompt, not a claim that code has already changed, tests have passed or a release has been published. The repo names were confirmed; their code and outstanding task lists must be audited by the executing agent. Public-source scan is preliminary; competitive investigation remains a required workstream. Suggested numerical targets require baseline calibration. Automated releases are deliberately gated; signed client telemetry is not proof of trustworthy reports.
