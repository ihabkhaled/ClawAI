---
name: akinator
description: Use for EVERY prompt in this repository that can change it - a feature, fix, refactor, upgrade, deletion, migration, config, docs, test, audit, release, or any request to add, change, remove, build, implement, update or improve something. Runs the full Akinator pass (ask, resolve, audit, plan, implement, document, skillify, rule, contextify, memoize, index and sync, verify) with no command typed. Also covers a new flagship or big feature, which must ship its public marketing page. Rule 65 and rule 66.
---

# Akinator (ClawAI project skill)

This is the auto-loading pointer. The procedure lives in the repository, not here.

1. Read [`skills/akinator/SKILL.md`](../../../skills/akinator/SKILL.md) and follow it. Nobody has to type a command; forgetting the plugin
   or the slash command is never a reason to skip the pass ([rule 65](../../../rules/65-akinator-runs-on-every-change.md)).
2. Start with `npm run knowledge:context -- --task="<task>"`, then declare the knowledge delta by path, or write
   `knowledge delta: none, because <reason>` for a typo or formatting-only change.
3. Documentation, skills, rules, context and memory land in the same commit as the code ([rule 63](../../../rules/63-docs-move-with-code.md)).
4. A new flagship, core or big feature, or product introduction also ships its public marketing page
   ([rule 66](../../../rules/66-every-flagship-feature-ships-a-public-marketing-page.md)).

The Python tools run read-only from the repository root: `python -I skills/akinator/scripts/<tool>.py`.
