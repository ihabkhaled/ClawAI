# Akinator Onboard

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: installing Akinator's standing behavior into a repository for the first time, when a repo has no knowledge layer and an agent keeps re-deriving the same context, or when asked to onboard, bootstrap or set up documentation structure for a codebase. Detects what already exists, maps onto it rather than replacing it, ranks the gaps and closes them in batches.

Onboarding installs the loop as a repository's default operating mode. It has two
modes, and choosing wrongly is the most damaging mistake available here:
imposing a structure on a repo that already had one produces two competing
taxonomies, and the agent picks the wrong one half the time.

**Detect first. Adopt, never impose.**

## When to use

- Installing Akinator into a repository for the first time.
- A repo where agents visibly re-derive the same context every session.
- Asked to "onboard", "bootstrap", "set up docs structure", or "make this repo
  AI-friendly".

## When NOT to use

- A repo already onboarded - use the loop and `akinator-coverage` instead.
- A single-file script or a throwaway. The knowledge layer costs more than it
  returns below a certain size; say so rather than installing ceremony.

## Procedure

### 0. Choose the mode

Look before deciding:

```bash
ls CLAUDE.md AGENTS.md CODEX.md GEMINI.md .cursorrules 2>/dev/null
ls -d rules skills context memory docs .ai 2>/dev/null
find . -name 'CLAUDE.md' -o -name 'AGENTS.md' -not -path './.git/*' | head
```

- **Anything found** - brownfield. Go to section A.
- **Nothing found** - greenfield. Go to section B.

A repo with a `docs/` folder and no routers is still brownfield: `docs/` has
conventions, and those conventions are what you adopt.

---

## A. Brownfield - a knowledge system already exists

### A1. Detect the conventions, not just the files

What matters is not that `rules/` exists but _how_ the repo writes rules. Record:

- **Routers** - which exist, at which levels, how thin, what they link.
- **Rules** - where, numbered or not, what sections, whether they name
  enforcement.
- **Skills or runbooks** - where, frontmatter or not, how titled, how indexed.
- **Context maps** - where, generated or hand-written, extractors present.
- **Docs** - grouped by kind, by team, or by service.
- **Memory** - present at all.
- **Generated layer** - `.ai/` or equivalent, and what writes it.
- **Enforcement scripts** - what exists and where it runs.
- **Index style** - bulleted lists, tables, descriptions after a dash.

### A2. Write the mapping document

Use Akinator's onboarding-mapping template. This is the deliverable that makes
adopt-never-impose verifiable rather than a promise. It records, per kind of
knowledge: what the repo calls it, where it lives, and whether Akinator adopted
or created that home.

The most important section is **Deliberately not changed** - the conventions
Akinator declined to "fix". Write it explicitly, because a future session will be
tempted to normalize them.

Where the repo's home differs from Akinator's default, the mapping is what future
sessions read. Configure the coverage checker to match, and say so.

### A3. Audit

Run the coverage check and the claim-vs-code audit:

```bash
python skills/akinator/scripts/akinator_coverage.py . --json
```

Combine with `akinator-audit` for claims the checker cannot see: docs describing
deleted behavior, business rules living only in a vendor dashboard, procedures
that are purely tribal.

Rank every gap by what it costs the next agent - see section C.

### A4. Blitz in batches

Close gaps biggest-context-payoff first, each batch obeying gate economy
(`akinator-gate-economy`). Typical order:

1. **Critical falsehoods** - docs asserting things that are not true. These
   actively mislead, so they outrank everything.
2. **Missing business and operational knowledge** - what must otherwise be
   re-derived under time pressure.
3. **Router gaps and drift** - especially a missing `AGENTS.md` when people use
   Codex, which means those sessions start with nothing.
4. **Unreachable artifacts** - good documents nobody can find.
5. **Ungenerated structural facts** - build the extractors.

### A5. Install the standing behavior

Update the routers to name the loop and point at the mapping document. From this
point every change in the repo runs the loop, using the _mapped_ homes.

---

## B. Greenfield - a bare repository

### B1. Interview

Run `akinator-intake`, extended - this is the one moment when a long battery is
correct, because nothing is written down yet:

- **Business** - what is this, who pays, what is it worth, what must never break.
- **Product** - who uses it, what are the core flows, what is deliberately out
  of scope.
- **Architecture** - what are the pieces, what talks to what, what was already
  decided and rejected.
- **Operations** - how is it run, deployed, migrated, recovered. What is the
  restart-versus-rebuild reality. What has already gone wrong.
- **Conventions** - what the owner wants enforced.

### B2. Scaffold from templates

Create the taxonomy using Akinator's templates, and the routers from
Akinator's router template. Create only what the interview and the code justify -
empty scaffolding trains people that the directories are decoration.

### B3. Extract what the code already proves

Do not write by hand what the tree can produce (`akinator-contextify`): routes,
env vars, dependencies, service topology, permissions. Write the extractors now,
while the tree is small enough that they are easy.

### B4. Write the first artifacts

- **Rules** from the conventions the owner named and the ones the code already
  follows - each with a real enforcement mechanism.
- **Skills** from the procedures the owner described in the interview,
  especially the operational ones.
- **Business and product docs** from the interview answers.
- **ADRs** for decisions the owner reports having already made - these are the
  highest-value artifacts in a greenfield repo, because they are the ones most
  likely to be lost.

---

## C. Ranking gaps (both modes)

| Severity     | Gap                                                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **critical** | A doc or router asserts something false. Anyone trusting it acts wrongly. Docs describing deleted behavior belong here |
| **high**     | Business or operational knowledge that exists nowhere and must be re-derived under pressure                            |
| **medium**   | Knowledge that exists but is unreachable from any index; a component that is present but not wired                     |
| **low**      | Knowledge that is present, true and reachable, but thin                                                                |

## D. The onboarding bar - the newcomer test

Onboarding is not done when the files exist. It is done when a fresh agent, given
only the knowledge layer, correctly answers - in seconds - where to go, what to
do, what not to break, and what to run afterwards, for each of the repo's **five
most common change types**.

Test it literally:

1. Identify the five most common change types from the git history.
2. For each, pose the question to a fresh-context agent with access only to the
   knowledge layer.
3. Grade: pass, partial, fail - and record the actual failure, which is the
   specification for the next batch.

Akinator's newcomer harness carries the method and the grading rubric.

## Failure modes and pitfalls

- **Imposing on a brownfield repo.** Creating `rules/` beside an existing
  `rules/` gives the repo two rule systems and no way to tell which
  wins. This is the worst outcome available from this station.
- **Detecting files but not conventions.** Adopting the directory name and
  ignoring the numbering, frontmatter and index style is only half an adoption,
  and the half that shows.
- **Scaffolding empty directories.** They teach readers the structure is
  decoration.
- **Doing the blitz in one batch.** Gate economy applies; a fifty-file
  onboarding batch cannot be verified meaningfully.
- **Declaring done because the files exist.** The newcomer test is the bar.
- **Adding git hooks.** Prohibited, always. Hooks gate code and must stay
  fast.

## Definition of done

- [ ] The mode was chosen from detection, not assumption.
- [ ] Brownfield: a mapping document exists, including a Deliberately-not-changed
      section.
- [ ] The coverage audit ran and every gap is ranked by severity.
- [ ] Gaps were closed in batches, biggest-payoff first, each gated once.
- [ ] Extractors exist for structural facts that are extractable.
- [ ] Every router names the loop and points at the knowledge entry points.
- [ ] The newcomer test was run literally against a fresh agent, and its results
      are recorded - including the failures, which become the next batch.
- [ ] No git hook was added.
