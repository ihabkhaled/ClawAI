# How to add a skill

1. Create `skills/<name>.md` with the YAML frontmatter (name, summary,
   task_keywords, applies_to, required_rules, required_context,
   affected_workspaces, required_tests, required_docs, validation_lane) and the
   standard body sections. See [skills/README.md](../../skills/README.md).
2. Ensure `task_keywords` will let the context resolver surface it.
3. Link to the rules it enforces and the reviewers it invokes.

After any change that affects generated facts, run `npm run knowledge:build` and
`npm run knowledge:verify`. Commit the regenerated `.ai/` alongside your change.
