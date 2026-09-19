# Publishing This Wiki

The Markdown files in this directory are the source of the GitHub Wiki.
Publishing is automatic: `.github/workflows/publish-wiki.yml` copies `wiki/`
into the separate `ClawAI.wiki.git` repository:

- on every push to `main` that changes `wiki/`;
- once a day;
- on demand (Actions → Publish GitHub Wiki → Run workflow).

The copy mirrors the folder: a page deleted here is deleted from the wiki.

## One-time step: create the first page

GitHub creates `ClawAI.wiki.git` only when the first wiki page is saved in the
web UI. No API or `git push` can create it. Until then, the workflow passes
with the warning "GitHub Wiki not initialized" and publishes nothing. This is
why the wiki was still empty on 2026-09-19 even though `wiki/` was on `main`.

1. Sign in as a repository admin and open
   <https://github.com/ihabkhaled/ClawAI/wiki>.
2. Click **Create the first page**, leave the text as it is, and click
   **Save page**.
3. Run the workflow (Actions → Publish GitHub Wiki → Run workflow), or wait
   for the next daily run. It replaces the placeholder with `Home.md` and
   every other page.

If the default token cannot push to the wiki, add a `WIKI_TOKEN` repository
secret: a fine-grained PAT with `contents: write` on this repository.

## Rules the checks enforce

`npm run knowledge:test` runs in pre-push and CI:

- **No two paths may differ only by case**
  (`tools/__tests__/no-case-colliding-paths.test.mjs`). On Windows and macOS
  they are one file, so the tree never looks clean, and the wiki would get two
  pages for one name.
- **Every `[[link]]` must reach a page that exists**
  (`tools/__tests__/wiki-links-resolve.test.mjs`). GitHub's syntax is
  `[[Link Text|Page-Name]]`, text first. Inside a table row, write the pipe as
  `\|`, or it splits the cell.

## Maintenance contract

1. Rebuild repository manifests before regenerating numeric/reference pages.
2. Prefer current code and generated manifests over older audit documents when they disagree.
3. Keep service/API/event/route/data pages in sync with `.ai/manifests/`.
4. Re-run the Wiki coverage audit after structural changes.
5. Treat Coding Agent content as a separate-repository snapshot and record its exact version.
