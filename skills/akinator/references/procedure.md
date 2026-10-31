# The pass - step by step

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when:
> running the complete pass - the phases, their exit conditions and the
> exact tool commands. The skill carries the outline; this is the detail.

`skills/akinator` means the directory holding `SKILL.md`; the tools are in
`skills/akinator/scripts/`, wherever the skill was installed.

Run the phases in order. Each names the station that owns it and the exit
condition that lets you leave it.

### Phase 1 - Establish the ground

0. **Cheapest context first** - before opening anything big, get a ranked
   reading list under a token budget instead of reading the tree:

   ```bash
   python skills/akinator/scripts/akinator_context.py pack --for "<task>" [--paths p ...] [--budget 3000]
   ```

1. **RESOLVE** (`akinator`) - read the layer: routers, rules, skills, context,
   memory, generated manifests, docs, and **the ledger**
   (`python skills/akinator/scripts/akinator_ledger.py list --recurring`). Cite what you
   found; a citation is the proof that this ran. The recurring failures are the
   ones most likely to bite this pass too.
2. **Detect the conventions** (`akinator-onboard`, section A1) - even outside
   onboarding. What does this repo call things? Adopt those names for everything
   that follows. Getting this wrong poisons every artifact the pass produces.
3. **ASK** (`akinator-intake`) - run the intake battery, minus what the layer
   already answered. Group the questions; ask once. Never guess on money,
   permissions, deletion or public contracts.
4. **AUDIT** (`akinator-audit`) - claim versus code for everything the work
   touches. Anything marked done names its live call path; anything marked
   missing names the search that failed.

4b. **SCOPE the pass** - which stations this change actually wakes:

    ```bash
    python skills/akinator/scripts/akinator_scope.py plan --against HEAD
    python skills/akinator/scripts/akinator_scope.py questions   # the batched ask, budget 15
    ```

    This **never skips a station**. It reports which have work, so a quiet one
    is run and finds nothing rather than being silently dropped. Ask the
    budgeted questions - up to 15, plus every gap from
    `python <upstream>/scripts/akinator_wiki.py gaps` - in **one grouped message**,
    ranked, each with a recommended default so "go with recommendations" is a
    complete answer. Write every answer into its home immediately. For wiki gaps
    use the grouped battery, then file each answer into its gap marker:

    ```bash
    python <upstream>/scripts/akinator_wiki.py interview [--limit N]
    python <upstream>/scripts/akinator_wiki.py answer --page P --line L --text T --source S
    ```

**Exit when:** the layer has been read, the conventions are named, the open
questions are asked or explicitly assumed, and every claim has a status.

### Phase 2 - Plan, and commit to the delta

5. **PLAN** (`akinator-plan`) - batches cut on real seams, blast radius per
   batch, and the **knowledge delta declared by path**. Empty categories are
   stated with their reason. Find who or what already governs the paths, and
   see which changed paths still lack a record:

   ```bash
   python skills/akinator/scripts/akinator_context.py owners --paths <path> ...
   python skills/akinator/scripts/akinator_trace.py plan
   ```

6. **Boardroom review, at plan time** - apply every lens the work touches. On
   Claude Code these are subagents shipped with the plugin; elsewhere apply the
   same questions inline:

   | Touches                                           | Lens           |
   | ------------------------------------------------- | -------------- |
   | money, entitlements, must-never-break             | business owner |
   | architecture, dependencies, boundaries, tradeoffs | CTO            |
   | user-facing behavior                              | product owner  |
   | schema, dependencies, build inputs, topology      | ops            |
   | numbers with business meaning                     | analyst        |
   | scope and completion honesty                      | PM             |

   A veto at plan time is cheap. The same veto at verify time costs the batch.

**Exit when:** every batch has a declared delta and no lens holds a veto.

### Phase 3 - Build, batch by batch

For **each** batch, in order:

7. **Check the machine** (`akinator-resource-guard`) before anything heavy.
8. **IMPLEMENT** - the code. No gates mid-batch.
9. **DOCUMENT** (`akinator-document-change`) - the why, the when-not-to, the
   business meaning, the operational consequence. Route each to its home.
10. **SKILLIFY** (`akinator-skillify`) - any procedure that will happen twice,
    written as the host repository's own skill, in its own conventions. Let the
    history say what repeats:

    ```bash
    python <upstream>/scripts/akinator_distil.py repeats [--since 90.days] [--min 3]
    ```

11. **RULE** (`akinator-rule-forge`) - any new constraint, with a mechanism that
    exists in the tree. Then check what the existing ones are doing:

    ```bash
    python <upstream>/scripts/akinator_rules.py conflicts   # overlapping, opposed
    python <upstream>/scripts/akinator_rules.py evolve      # a rule that caused a failure
    ```

    If this batch's failure was **caused by an existing rule's enforcement**,
    record it - `akinator_rules.py caused <rule> <fingerprint>` - and write the
    replacement that satisfies both. The superseded rule stays; deleting it
    deletes the reason the replacement is shaped as it is.

12. **CONTEXTIFY** (`akinator-contextify`) - structural facts; build the
    extractor rather than the map wherever the fact is derivable. **Do not write
    a document per library, component or module** - one generated map replaces
    N generated documents, and the prose budget goes to the decision that chose
    the dependency and the failure it caused:

    ```bash
    python skills/akinator/scripts/extract_stack.py --write   # dependencies and modules
    ```

    Before writing any doc, ledger or memory text that quotes config or logs,
    pre-check it: `python skills/akinator/scripts/akinator_sensitive.py guard FILE`
    (or `--stdin`).

13. **MEMOIZE** (`akinator-memoize`) - decisions, surprises, dead ends, with
    dates and reversal conditions. Prune while you are there.

13b. **LEDGER** - record what actually happened, not only what was decided:

    ```bash
    python skills/akinator/scripts/akinator_ledger.py add failure --title "..." --field ...
    python skills/akinator/scripts/akinator_ledger.py occurred <fingerprint> --source self-report
    python skills/akinator/scripts/akinator_ledger.py list --recurring
    ```

    Anything at two occurrences or more **stops the pass** and asks whether it
    should become a rule, a skill, or neither:

    ```bash
    python <upstream>/scripts/akinator_distil.py detect     # what reached the threshold
    python <upstream>/scripts/akinator_distil.py propose <fingerprint>
    python <upstream>/scripts/akinator_distil.py decide <fingerprint> --as rule --note "..."
    ```

    Record the answer either way; **`neither` is valid** and stops it being
    re-asked. Recurrence proves the failure is real; it does not prove an
    enforceable mechanism exists.

14. **Record decisions** (`akinator-adr`) - anything chosen between real
alternatives. 15. **Business, product, operations** (`akinator-business-map`,
`akinator-product-map`, `akinator-ops-map`) wherever the batch touched
money, user-visible behavior, or how the system is run. 16. **INDEX and SYNC** (`akinator-index-sync`, `akinator-router-sync`) - every
artifact reachable; every router updated together. Regenerate the derived
pages the change touched:

    ```bash
    python <upstream>/scripts/extract_platform.py --write     # data, services, observability, standards, security, integrations
    python <upstream>/scripts/extract_history.py --write      # history
    python <upstream>/scripts/extract_operations.py --write   # tools, env vars, repositories, installation
    python skills/akinator/scripts/akinator_sensitive.py register --write
    python <upstream>/scripts/akinator_wiki.py index
    ```

17. **Librarian review** - on every batch, without exception: is the declared
delta present, routed to its home, reachable and true? On Claude Code this is
the librarian subagent. Do not call a batch done over a `BLOCKED`.

**Exit each batch when:** the librarian review returns `CLEAR`.

### Phase 4 - Prove it

18. **Gate once** (`akinator-gate-economy`) - at the end, scoped to what was
    touched. Fix reds, re-run only what was red, judge by exit codes.
19. **Run every mechanical check the repository has** - its own tests, linters
    and drift checks - plus the knowledge invariants:

    ```bash
    python skills/akinator/scripts/akinator_coverage.py . --strict
    python skills/akinator/scripts/akinator_ledger.py verify
    python <upstream>/scripts/akinator_rules.py conflicts
    python skills/akinator/scripts/akinator_trace.py check      # every changed path accounted for
    python skills/akinator/scripts/akinator_sensitive.py scan   # no leaked secret in tracked files
    ```

    `trace check` exits 1 on an unaccounted path; `trace record --title T`
    writes the change record that accounts for the diff.

    **Version discipline.** When the diff touches a shipped path, bump the
    version in the same batch, before the check below:

    ```bash
    python skills/akinator/scripts/akinator_version.py next --base HEAD    # why: major, minor or patch
    python skills/akinator/scripts/akinator_version.py bump minor --date YYYY-MM-DD
    python skills/akinator/scripts/akinator_version.py check --base HEAD   # exit 1 = no bump, or no changelog heading
    ```

    New or removed tool, reference, rule or hook is minor; a fix under existing
    files is patch; a removed or renamed public entry point is major. `bump`
    rewrites every manifest and seeds the changelog heading - fill it in.

20. **Coverage and the newcomer test** (`akinator-coverage`) - both halves. A
    green mechanical run measures presence and consistency, not usefulness. Say
    which one you ran.
21. **Anti-gaming sweep** (`akinator-anti-gaming`) - turned on your **own**
    output from this pass. Every doc faces the delete-the-derivable test; every
    ticked box names an artifact changed in this pass; every coverage claim is
    sampled, not asserted.
22. **Boardroom review, at verify time** - the same lenses, against what was
    actually built rather than what was planned.
23. **Clean up** (`akinator-resource-guard`) - machine as you found it. Verify by
    listing, not by assuming.

23b. **Regenerate the brief** - `python <upstream>/scripts/build_brief.py --write`.
It is what the next session reads; everything this pass learned is invisible
until it is composed in.

**Exit when:** every check has been run and its exit code observed, the brief is
current, and no lens holds a veto.

### Phase 5 - Loop until proven, then stop

24. Re-read the Definition of Done below. For every unmet line, the fix is a new
    batch: return to phase 3 for that batch only.
25. Repeat until every line is met **with evidence**, or until a line is blocked
    by something outside your control - in which case say so explicitly, name
    what is blocked and by whom, and stop.
26. **Then stop.** Exhaustive does not mean endless. Once the DoD is proven,
    further polishing is scope you were not asked for.

## The one exception

If the work is genuinely trivial - a typo in a comment, a formatting-only change

- say so **in one line, out loud**, do it, record `knowledge delta: none,
because ...`, and stop. Performing the full pass on a typo is how a team learns
  to stop running any of it.

That judgment is made once, explicitly, and it is not a licence to scale down by
default. Everything above still applies the moment the change is more than
trivial, and the librarian review still runs on every batch you do open.
