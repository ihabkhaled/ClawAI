# Akinator Router Sync - station 11b

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: whenever a change alters what an AI entry-point file should say - CLAUDE.md, AGENTS.md, CODEX.md, GEMINI.md, cursor rules, or any per-module router. Updates every router in the same change so no tool reads a different version of the truth, and keeps routers thin indexes rather than mirrors.

Every AI tool reads a different entry file. Claude Code reads `CLAUDE.md`, Codex
reads `AGENTS.md`, Cursor reads its rules, and teams add more each year. Each one
that gets updated alone becomes a separate version of the truth, and an agent
reading the stale one acts confidently and wrongly.

Router sync is **one atomic operation**: all routers, same change, or none.

## When to use

- A rule, skill, doc, context map or ADR was created, moved or deleted.
- A convention changed.
- A module was added, renamed or removed.
- Anything that alters what a router should say about where to go or what not to
  break.

## When NOT to use

- To add narrative. Routers are indexes, not documents. If you are writing
  paragraphs, the content belongs in `docs/` and the router links to it.
- To duplicate a rule's text. The router names the rule and links; the rule holds
  the content.

## Procedure

### 1. Discover every router present

Do not assume the set. Look for:

- Root - any of these, and any other file the repo's tooling reads first:

  ```
  CLAUDE.md   AGENTS.md   CODEX.md   GEMINI.md
  .cursorrules   .cursor/rules/*   <repo>/.github/copilot-instructions.md
  ```

- Per-module: the same filenames inside module and service directories.
- Nested: Codex and Claude both walk up from the working directory, so a router
  three levels down is real and must be kept true.

Record the discovered set. If the repo has routers Akinator does not know about,
they are in scope anyway - the law is that no AI entry point forks.

### 2. Keep routers thin

A router is a per-tool index. It contains:

- **What this repo is**, in two or three sentences.
- **Where the knowledge lives** - links to the rules index, skills index, context
  index, docs index, memory index.
- **The few constraints that must be seen before any work** - linked, not
  reproduced.
- **How to run, build and test** - the commands, or a link to them.
- **Per-module pointers** - where to find the router for the area being touched.

It does **not** contain: full rule text, architecture narrative, business logic,
or a copy of anything with another canonical home. A 2,000-line router is a
symptom that content has migrated into the index.

### 3. Write once, project per tool

The canonical content lives in `rules/`, `skills/`, `context/`, `docs/`. Routers
project it per tool. Where the repo has a generator, run it. Where routers are
maintained by hand, make the same edit in each in this batch - and if the repo
has more than two routers, building the generator is usually the better use of
the same time (`akinator-contextify` covers extractor conventions).

Tool-specific differences are legitimate where the tool differs - a Claude router
may name skills and slash commands that Codex does not have. **The facts must not
differ.** If `CLAUDE.md` says migrations require a container rebuild and
`AGENTS.md` does not mention it, that is a fork.

### 4. Per-module routers

A module with its own constraints gets its own router. It states only what is
local: this module's rules, its entry points, its tests, its gotchas - and links
up to the root. The root router links down to it. Both directions, or the module
router is unreachable.

### 5. Verify no fork

Run the coverage check (`akinator-coverage`). It compares the routers' factual
claims and fails on divergence. Divergence that is intentional and tool-specific
must be stated as such in the routers themselves, so the checker and the reader
can both tell it apart from rot.

## Failure modes and pitfalls

- **Updating the router you happen to use.** The single most common source of
  fork. Whichever tool you are in, all routers change together.
- **The router that became a document.** Content crept in, nobody links out
  anymore, and now the router and the docs disagree.
- **Mirroring rule text into the router.** Two copies, one of which will be
  edited alone.
- **Forgetting per-module routers.** Root updated, module stale - and the module
  router is the one the agent actually reads when working in that directory.
- **Assuming the router set.** A repo picked up `.cursorrules` two years ago and
  nobody remembers. Discover, do not assume.
- **Hand-syncing three or more routers forever.** Build the generator.

## Definition of done

- [ ] Every router in the repo was discovered, including per-module and nested.
- [ ] All of them were updated in this change; none was left behind.
- [ ] No router contains content that has a canonical home elsewhere.
- [ ] Per-module routers link up and are linked down to.
- [ ] Any intentional per-tool difference is labeled as intentional.
- [ ] The coverage check reports no router fork.
