# Publishing This Wiki

The Markdown files in this directory are the reviewable source for the GitHub Wiki.

GitHub stores repository Wiki pages in a separate Git repository named `ClawAI.wiki.git`. The connected GitHub API surface used to generate this documentation can write normal repository files but does not expose Wiki Git writes, so publication is intentionally a separate explicit step.

## Publish from a machine authenticated to GitHub

```bash
tmp="$(mktemp -d)"
git clone git@github.com:ihabkhaled/ClawAI.wiki.git "$tmp/ClawAI.wiki"

find "$tmp/ClawAI.wiki" -mindepth 1 -maxdepth 1 -type f -name '*.md' -delete
cp wiki/*.md "$tmp/ClawAI.wiki/"

cd "$tmp/ClawAI.wiki"
git add -A
git commit -m "docs: publish comprehensive ClawAI wiki"
git push origin master
```

If the Wiki repository uses `main` instead of `master`, push the checked-out branch reported by `git branch --show-current`.

## Maintenance contract

1. Rebuild repository manifests before regenerating numeric/reference pages.
2. Prefer current code and generated manifests over older audit documents when they disagree.
3. Keep service/API/event/route/data pages in sync with `.ai/manifests/`.
4. Re-run the Wiki coverage audit after structural changes.
5. Treat Coding Agent content as a separate-repository snapshot and record its exact version.
