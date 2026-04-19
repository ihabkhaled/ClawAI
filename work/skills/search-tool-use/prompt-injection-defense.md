---
id: prompt-injection-defense
title: Prompt injection defense
category: search-tool-use
level: mandatory
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - security-lead
  - ai-platform-team
---

# Prompt injection defense

## Purpose

Scraped pages and fetched content can contain prompts that try to hijack the LLM ("Ignore previous instructions and …"). Defend every time.

## Strict rules

- **MUST** clearly delimit user content from system instructions ("--- BEGIN UNTRUSTED CONTENT ---").
- **MUST** instruct the final model to treat scraped content as data, not instructions.
- **MUST** sanitize obvious injection phrases in logs (don't rewrite content, but flag).
- **MUST NOT** allow scraped content to change tool-use policy (e.g. "call the delete endpoint").
- **MUST NOT** pass raw HTML — normalize to structured text first.

## Anti-patterns

- Concatenating scraped text into the system prompt.
- Trusting `<script>` output as data.
- Letting the LLM decide whether to trust scraped content.

## Validation checklist

- [ ] Content delimiters in prompt
- [ ] "treat as data" instruction included
- [ ] No tool calls triggered by scraped content
- [ ] Log flagging for injection attempts

## Quality gate

| Check                       | Blocker? | Evidence                        |
| --------------------------- | -------- | ------------------------------- |
| Injection test suite passes | yes      | `ai-platform/test-injection.sh` |

## Definition of done

1. Defenses in place.
2. Injection test suite green.
