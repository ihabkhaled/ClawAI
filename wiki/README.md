# Wiki source

This directory is the version-controlled source for the GitHub Wiki.

- Edit/add Markdown here.
- Merge to `main`.
- `.github/workflows/publish-wiki.yml` publishes it to `ihabkhaled/ClawAI.wiki.git`, after `tools/knowledge/render-wiki.mjs` renders the mirror pages (`wiki/mirrors.json`) and the manifest pages at publish time.
- `Home.md`, `_Sidebar.md`, and `_Footer.md` are GitHub Wiki special pages.

Only hand-written pages live here. A page that would restate a repository doc is listed in `wiki/mirrors.json` and rendered from that doc when the wiki is published, so it cannot drift; never add a copy of it to this directory.
