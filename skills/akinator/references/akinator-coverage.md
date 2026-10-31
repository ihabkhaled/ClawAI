# Akinator Coverage

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: to audit whether a repository's knowledge layer is complete, reachable and true - before claiming onboarding is done, when docs are suspected of being stale, periodically as a health check, or when a fresh agent gets lost in a repo that is supposedly documented. Runs the mechanical invariants and the qualitative newcomer test.

Coverage has two halves, and passing only one is a false pass.

The **mechanical** half is cheap, exact and shallow: are the artifacts present,
reachable, internally consistent, and do the things they name exist? A script
answers this.

The **qualitative** half is expensive, approximate and deep: can a fresh agent
actually act? Only a fresh agent can answer this, and its failures are the real
specification for the next batch.

A repository can pass every mechanical invariant and still fail the newcomer
test completely - perfectly indexed documents that answer no question anyone has.

## When to use

- Before claiming onboarding is done.
- Periodically as a health check - quarterly, or after any large feature.
- When docs are suspected of being stale.
- When a fresh agent gets lost in a repo that is supposedly documented. That is
  a coverage failure, and it is the most informative one available.
- In CI, on every push.

## When NOT to use

- Mid-batch. It is a verification station, not a working tool.
- **Never in a git hook.** Hooks gate code and must stay fast.

## Procedure

### 1. Run the mechanical invariants

```bash
python skills/akinator/scripts/akinator_coverage.py <repo-root>
python skills/akinator/scripts/akinator_coverage.py <repo-root> --json      # machine-readable
python skills/akinator/scripts/akinator_coverage.py <repo-root> --strict    # fail on medium too
python skills/akinator/scripts/akinator_coverage.py <repo-root> --list-checks
```

The checks, and what each one prevents:

| Check                | Invariant                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `reachability`       | Every rule, skill, context map, doc and memory entry is reachable from an index. Unindexed means nonexistent                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `index-completeness` | Every artifact appears in its **own** category index, not merely somewhere in the tree. Reachable from a router is not the same as findable by someone browsing the index. Covers rules, skills, context, memory, ADRs, docs, business, product, ops, templates, agents and eval suites - a category with no index is left to `reachability` rather than double-counted                                                                                                                                                                                                                                                                                                                                                                                |
| `dead-links`         | No link points at a file that does not exist. Dead links teach readers to distrust indexes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `rule-enforcement`   | Every rule names an enforcement mechanism that exists in the tree - and it is not a git hook                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `router-sync`        | No root router omits knowledge the others carry, unless marked tool-specific                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `module-routers`     | Every module or service has a local router                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `generated`          | A file that declares itself generated says how to get a correct copy. Two forms count: it **names a generator that exists** in the tree, or - if it was **installed from somewhere else** - it names its origin and how to refresh it, and no local file at all. The second form matters because a vendored artifact's generator is deliberately absent, and demanding one turns a correct file into a finding. A banner that still names a generator is checked either way, so "installed from" cannot be written to silence it. The vendored form is recognised by two literal phrases - "installed from" and "reinstall" - so a banner using different words for the same thing lands as a MEDIUM "names no generator" finding rather than an error |
| `doc-truth`          | Paths named in docs exist in the tree                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `skill-format`       | Every skill has trigger frontmatter and the required sections                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `staleness`          | Every context map states a regenerate-or-review trigger                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `git-hooks`          | No knowledge check is wired into a git hook                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

Exit code is 0 when nothing sits at or above the threshold (`--fail-on`,
default `high`), 1 otherwise, 2 if the checker could not run.

**Two invariants are MEDIUM** - `reachability` and `index-completeness` - so the
default threshold lets an unindexed artifact pass. That is deliberate: a repo
onboarding gradually would otherwise face a wall of medium findings on day one
and switch the check off. Once the layer is healthy, move CI to `--strict`, as
this repository does.

**Two limits of `index-completeness`, stated rather than discovered:**

```
depth   it looks one level deep - <repo>/rules/sub/deep.md is not checked
case    path comparison is case-insensitive on Windows, so 01-A.md
        satisfies 01-a.md there; Linux CI catches it via dead-links
```

Both are worth knowing before trusting a green run on a deep tree.

### 2. Read the failures as a specification

Each finding names the artifact, the problem and the station that fixes it. Group
them into batches by `akinator-plan`; do not fix them one at a time as they
appear, which produces a gate storm.

### 3. Run the newcomer test

The qualitative half. See section below.

### 4. Report honestly

Report what ran, what passed, what failed, and what was **not** checked. The
mechanical checks cannot see whether a document is _useful_ - say so, rather than
letting a green run imply coverage it does not measure.

## The newcomer test

### Setup

1. From the git history, identify the repo's **five most common change types** -
   e.g. add an endpoint, add a background job, change a plan limit, add a
   migration, debug a failing job.
2. For each, write the question a newcomer would actually ask:
   _"I need to add an API endpoint. Where do I go, what do I do, what must I not
   break, and what do I run afterwards?"_

### Run

Pose each question to a **fresh-context** agent with access to the repository but
no conversation history and no hints. Give it the knowledge layer and nothing
else - no explanation from you, because your explanation is exactly the thing
that will not be there next time.

Time it. "In seconds" is part of the bar; an answer that takes fifteen minutes of
searching is a fail even when it is correct, because in practice nobody spends
those fifteen minutes - they guess.

### Grade

| Grade       | Meaning                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------- |
| **pass**    | Correct answer, quickly, citing the layer                                                     |
| **partial** | Correct direction, but missed a constraint, a required step, or the operational consequence   |
| **fail**    | Wrong, or could not answer, or answered confidently from inference rather than from the layer |

Confident-but-inferred is a **fail**, and the most dangerous result: the layer
did not answer, and the agent did not notice.

### Use the failures

Every failure names a missing artifact. That list is the next improvement batch,
and it is better specified than anything you would have written yourself.

Record results in the repo - a results directory next to the eval suites, or
whatever the repo already uses - with the date, so improvement is visible
across runs.

## Failure modes and pitfalls

- **Treating a green mechanical run as coverage.** It measures presence and
  consistency, not usefulness.
- **Running the newcomer test with a warm agent.** An agent that watched you
  build the layer knows things the layer does not contain. Use a fresh context.
- **Helping during the test.** Every hint invalidates the result.
- **Grading generously.** A confident wrong answer is worse than "I do not
  know", because in production nobody checks.
- **Fixing findings one at a time.** Batch them.
- **Weakening a check to get green.** Never - see `akinator-anti-gaming`.
- **Running it in a git hook.** Prohibited.

## Definition of done

- [ ] The mechanical checker ran; its exit code was observed, not assumed.
- [ ] Findings are ranked and grouped into batches.
- [ ] The newcomer test ran against a genuinely fresh agent, unaided, on the five
      most common change types.
- [ ] Results are recorded with an absolute date.
- [ ] Failures were converted into a specification for the next batch.
- [ ] The report states what was not checked, not only what passed.
