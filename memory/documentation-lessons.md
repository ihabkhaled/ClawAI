# Documentation Lessons

Durable lessons about keeping the written system honest (docs/, CLAUDE.md, ADRs,
i18n as data, generated knowledge layers). See [README](README.md) for format.

---

### Mirrored documents always diverge — single-source and generate the rest (2026-07-24)

**What happened.** Agent guidance lived in three large mirrored files sharing ~170
identical headings; they drifted in size (153/119/19 KB) and in content (one
recommended a bypass others forbade).

**The durable lesson.** Two hand-maintained copies of the same knowledge are a
divergence machine. The cost is paid later as contradictory instructions that
different tools/agents follow into different behavior.

**How to apply.** Keep one canonical authority. Per-tool entrypoints are compact
routers that reference it, not copies. Derive machine-readable knowledge (a generated
`.ai` layer) from the source of truth rather than editing parallel prose.

**Related.** ADR-055 canonical-ai-authority-hierarchy; ADR-056 generated-ai-knowledge-layer;
ADR-058 compact-ai-routers; [architecture-decisions](architecture-decisions.md).

---

### A schema type and its data instances are one atomic change (2026-07-24, from 2026-05-10)

**What happened.** Locale files and their schema type (`i18n.types.ts`) were changed
apart, breaking the build; and English placeholders shipped to non-English locales,
shipping an English UI to real users of other languages.

**The durable lesson.** Documentation-as-data (locales, generated indexes, catalogs)
obeys the same rule as code: the schema and its instances move together, and a
placeholder in the wrong form is a shipped defect, not a TODO.

**How to apply.** Update schema + all instances in one commit. Run the audit script.
Spot-check a real instance (a non-English locale in the browser). Applies equally to
any generated index whose entries must match a declared shape.

**Related.** [known-pitfalls](known-pitfalls.md); [frontend-patterns](frontend-patterns.md).

---

### Docs are part of "done," and stale docs are worse than none (2026-07-24)

**What happened.** Features shipped without doc updates; later readers trusted docs
that no longer matched the code and made wrong decisions.

**The durable lesson.** A doc that lies is more dangerous than a missing doc, because
readers act on it. Documentation that isn't updated with the change it describes
becomes a trap the moment the code moves.

**How to apply.** Every feature updates the relevant `docs/` file, service `CLAUDE.md`,
and root `CLAUDE.md` if patterns changed. New service → `docs/04-backend/service-guide-<name>.md`.
New env var → environment-variables doc. New endpoint → api-reference. No doc =
incomplete. Use the SDLC template so the artifact set is explicit.

**Related.** `CLAUDE.md` → Phase 11 Documentation;
`../docs/features/_template/README.md`.

---

### An ADR captures the decision _and_ how to reverse it (2026-07-24)

**What happened.** Decisions were made without recording alternatives considered or a
rollback path, so later reconsideration had to reconstruct the reasoning from scratch.

**The durable lesson.** The value of an ADR is the reasoning and the exits, not just
the choice. Without alternatives and rollback, a future team can't tell a deliberate
trade-off from an accident, or safely undo it.

**How to apply.** Every ADR records Context, Decision, Alternatives, Consequences,
Migration, Validation, Rollback. Store in `docs/13-adr/` with the next sequential
number. Link the ADR from the memory entry that lives with its consequences.

**Related.** [`../docs/13-adr/`](../docs/13-adr/);
[`../docs/exceptions/README.md`](../docs/exceptions/README.md).
