# Pre-commit checklist

Before running `git commit`.

- [ ] `npm run lint` → 0 errors
- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run test` → all pass
- [ ] No `console.log` left in source
- [ ] No `TODO` without a tracked issue
- [ ] No commented-out code
- [ ] Self-reviewed the diff line-by-line (`coding-quality/code-self-review.md`)
- [ ] Conventional commit message prepared
- [ ] No `--no-verify` intent
