# Akinator Index Sync - station 11a

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: whenever a knowledge artifact is created, renamed, moved or deleted - a rule, skill, doc, context map, ADR or memory entry. Makes every artifact reachable from an index and removes index entries pointing at things that no longer exist.

**Unindexed means nonexistent.** An agent with a fresh context window finds
artifacts by following links from an entry point. A perfect document that nothing
links to will never be read, and the effort that produced it is lost.

The inverse is worse: an index entry pointing at a deleted or moved file teaches
the reader that the index cannot be trusted, and once that is learned they stop
following it at all.

## When to use

Any time a knowledge artifact is created, renamed, moved or deleted. This
includes deletion - especially deletion.

## When NOT to use

- For code files. Indexes cover the knowledge layer; code is found by structure
  and by context maps.
- As a separate cleanup pass later. It is part of the batch that changed the
  artifact.

## Procedure

### 1. Find every index that should reference the artifact

An artifact is usually reachable from more than one place:

- Its **category index** - whatever this repo uses. Commonly:

  ```
  rules/README.md   skills/README.md   docs/README.md
  docs/13-adr/adr-index.md   memory/index.md
  ```

- Its **routers** - the root `CLAUDE.md`, `AGENTS.md`, `CODEX.md` and any
  per-module router in the directory it belongs to. Router updates are the job of
  `akinator-router-sync`, run in the same batch.
- **Related artifacts** - the rule that cites the ADR, the doc that links the
  context map, the skill that references the runbook.
- **Generated manifests** - `.ai/` where the repo has that layer. Regenerate;
  never hand-edit.

Match the repo's existing index conventions. If entries elsewhere in the index
carry a one-line description, yours does too. If they are grouped by topic, group
yours the same way.

### 2. Write the entry so it is selectable

An index entry exists to let a reader decide, without opening the file, whether
it is the one they want. That means the entry names the **situation**, not just
the title:

```markdown
Weak:

- [Quotas](business/quotas.md)

Strong:

- [Quotas](business/quotas.md) - how quota is granted, consumed, restored on
  refund, and what happens at plan change
```

### 3. Handle deletion and renames

When an artifact is removed or moved, grep the whole tree for its path and its
title, and fix every reference in this batch. Missing one leaves a dead link,
which is a coverage failure.

### 4. Verify reachability, not just presence

Presence in an index is not enough if the index itself is unreachable. Walk the
path a fresh agent would take: router -> category index -> artifact. If any hop
is missing, the artifact is still invisible.

Run the coverage check (`akinator-coverage`) to confirm mechanically.

## Failure modes and pitfalls

- **Creating the artifact and stopping.** The most common way good documentation
  becomes invisible documentation.
- **Indexing in one place only.** Reachable from the category index but not from
  any router means it is only found by someone who already knew where to look.
- **Dead links after a delete or rename.** Teaches readers to distrust indexes.
- **Entries that restate the filename.** Give no basis for choosing; the reader
  opens five files instead of one.
- **Hand-editing a generated index.** Fix the generator.
- **Index drift accumulating quietly.** Every batch that touches an artifact
  keeps its indexes true; there is no cleanup sprint.

## Definition of done

- [ ] Every created or changed artifact appears in its category index.
- [ ] Every entry names the situation the artifact serves, not just its title.
- [ ] The reachability path from a router to the artifact is unbroken.
- [ ] Deleted and renamed artifacts have no remaining references anywhere in the
      tree.
- [ ] Generated indexes and `.ai/` manifests were regenerated, not hand-edited.
- [ ] The coverage check reports no unreachable artifacts, no dead links,
      and no artifact missing from its own category index.
