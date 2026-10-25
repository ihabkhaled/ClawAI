## Summary

What changed and why (three bullets at most).

## Type

- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation
- [ ] Test
- [ ] Tooling / CI

## Docs impact (required — rules/63)

<!-- Mirror of the commits' `Docs:` trailers. One of: -->

- Updated: <the docs this change made stale, and that it fixed>
- None, because: <the specific reason no document describes this change>

## QA evidence (rules/60)

- Record: `docs/qa-evidence/<date>-<slug>.md` — all 15 lanes, PASS / NOT_RUN / NOT_APPLICABLE with reasons

## Checklist

- [ ] Landed through the hooks (no `--no-verify`); every commit has a `Docs:` trailer
- [ ] `CI success` is green (required CI gates pass; Policy and ai-native-os are advisory)
- [ ] No secrets, no `eslint-disable`, no lowered coverage threshold
