# Skill — Lint and test only what changed

**Rule:** [`rules/48-lint-and-test-only-what-changed.md`](../rules/48-lint-and-test-only-what-changed.md)

Use this every time you are about to commit.

## 1. Which files did I change?

```bash
git status --porcelain | awk '{print $2}'
```

## 2. Lint exactly those

```bash
npx eslint <file> <file> --fix
```

Not `npm run lint`. That lints the whole workspace to report on your three
files, and the pre-commit hook is going to lint the staged ones again anyway.

## 3. Typecheck + test the touched workspace, once

```bash
cd apps/claw-<service>
npm run typecheck
npx vitest run                     # whole workspace, once, at the end
npx vitest run src/path/x.spec.ts  # while iterating
```

If you changed two workspaces, run it in both. If you changed twenty, you are
probably doing a migration and should be batching per workspace anyway.

## 4. Commit and push

```bash
git add <explicit paths>
git commit -m "<conventional commit>"
git push origin main
```

The hooks re-run the scoped versions of what you just did. That is the safety
net, not a reason to run the expensive versions first.

## When the push is rejected

Someone else pushed. `git fetch origin main && git rebase --autostash origin/main`
then push again. Do not re-run the gates — the tree you proved is the tree you
are pushing, plus commits that already passed their own.

## Anti-patterns

| Don't                                                                                | Do                                 |
| ------------------------------------------------------------------------------------ | ---------------------------------- |
| `npm run lint` at the root                                                           | `npx eslint <changed files> --fix` |
| `npm run lint` in a workspace to check one file                                      | same as above                      |
| Running every workspace's tests                                                      | the touched workspace, once        |
| Running the gates, then letting the hooks run them again, then re-running on failure | run once, let the hooks confirm    |
