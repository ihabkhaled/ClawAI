# Knowledge generator architecture

```
tools/lib/
  repo.mjs         # fs primitives, workspace discovery, isMain, sorted traversal
  fact.mjs         # verified()/unverified() tagging, stableStringify, hash, cmp
  extractors.mjs   # one function per inventory dimension (shared by all tools)
  analyzers.mjs    # contradictions, port gaps, staleness, duplication, bypass scan
  manifests.mjs    # extractAll() -> manifest map
tools/audit/       # baseline report (inventory.snapshot.json)
tools/knowledge/   # build (manifests/bootstrap/packs/agents), context, verify
tools/affected/    # git-diff + dependency graph -> scoped gates
tools/release/     # preflight (full gate in order)
```

One extraction layer, reused by every tool — never reimplemented per tool
(rules 23/26). Node stdlib only; deterministic (locale-independent `cmp`,
recursively-sorted JSON).
