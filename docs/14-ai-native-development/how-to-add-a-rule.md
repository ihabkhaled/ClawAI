# How to add a rule

1. Create `rules/NN-<name>.md` using the standard sections (Purpose, Applies to,
   Mandatory rules, Prohibited patterns, Correct pattern, Enforcement, Related
   skills, Related context, Definition of done). See [rules/README.md](../../rules/README.md).
2. Name its **enforcement** mechanism (ESLint / TS / unit test / architecture
   test / knowledge check / CI / hook / review). A rule with no enforcement must
   be marked review-gated.
3. Cross-link related rules/skills/context with relative links.

After any change that affects generated facts, run `npm run knowledge:build` and
`npm run knowledge:verify`. Commit the regenerated `.ai/` alongside your change.
