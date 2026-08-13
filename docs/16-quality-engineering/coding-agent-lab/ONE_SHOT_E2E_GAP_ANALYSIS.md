# What stops the coding agent from delivering a feature end-to-end in one prompt

The password-reset mission (2026-08-13) proved the agent **can** write the whole
feature — backend and frontend, 13 locales, security properties intact. It did
not do it in one prompt. It took roughly forty supervisor interventions.

Every one of those interventions is a product defect, not a fact of life. This
document turns the run into a ranked work list: for each intervention, what the
supervisor had to do, why the agent could not do it alone, and the change that
would remove the need.

Ranked by how many interventions each fix removes.

---

## Tier 1 — the four fixes that remove most of the babysitting

### 1.1 The runtime must own the checklist, not the model's memory

**Observed.** The agent stopped to report after finishing each file, roughly
fifteen times. Each stop cost a supervisor turn whose entire content was "don't
stop, keep going, here is the list again". It also silently dropped items:
after `use-login-form.ts` was restored from a destructive edit, the agent never
re-did the change it had lost, because the only record of that work was in a
conversation turn that had scrolled out of context.

**Why it happens.** The task list lives in the prompt. The prompt is subject to
the same truncation and context pressure as everything else, so the plan decays
exactly when the run gets long enough to need it.

**Fix.** Give a run a durable, runtime-side task ledger. The model proposes the
list up front; the runtime stores it outside the transcript, marks items done
only when their acceptance check passes, and re-injects the _open_ items —
short, and current — on every turn. The agent does not get to end its turn while
open items remain and the budget allows.

This single change addresses the stop-and-report loop, the dropped item, and
most of the value of the fresh-conversation restarts described in 1.4.

### 1.2 Gates must run automatically and feed back, without being asked

**Observed.** The agent wrote code that did not compile and did not know it. The
supervisor ran `tsc`, `eslint` and `vitest` after nearly every write and pasted
the errors back. That is the single largest category of intervention in the run.
Roughly a dozen of the sixteen defects found — the invented module path, the
invented enum member, the wrong `logger.error` signature, the unused
destructured variable, the two import-order errors — were things the project's
own tooling reports in under a second.

**Fix.** After a mutation settles, the runtime runs the touched workspace's
typecheck and lint and returns the diagnostics as part of the tool result. The
agent then sees its own compile errors the way a human sees red squiggles,
instead of learning about them one supervisor round-trip later.

Scope it the way the repo already requires: the touched workspace only, never
all seventeen.

### 1.3 Resolve imports and symbols before the write lands

**Observed, four separate times.**

- `import { ROUTES } from '@/constants/routes'` — no such module; the file is
  `constants/routes.constants.ts` and every other file imports the barrel.
- `AlertVariant.Destructive` — invented; the enum has `Error`.
- `<Alert>` given children — the component takes `title` and `description` props.
- New types added to `types/auth.types.ts` but not exported from the barrel, so
  importers could not see them.

Each cost a full detect-describe-refix cycle.

**Fix.** Before a write is committed, resolve every import specifier the diff
introduces against the workspace `tsconfig` paths, and reject the write with the
specific message — _"`@/constants/routes` does not resolve; did you mean
`@/constants`?"_ — instead of accepting it and letting it fail a gate later.
Member access on an imported enum can be checked the same way.

This is strictly cheaper than 1.2 and catches the most confidently-wrong class
of error the model produces: the plausible-looking symbol that does not exist.

### 1.4 A fresh read's hash must survive the turn that uses it

**Observed.** The dominant failure mode of the whole run. `patch` requires the
file's current `sha256`. `read` returns it. But
`RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS = 400` truncates the _history_ copy of
that result, so the moment the agent emitted any prose between the read and the
patch, the hash it needed was gone — and it would re-read, narrate, lose it
again, and loop. The supervisor's standing instruction became "no prose between
a read and its write", which is a workaround the user should never have to know
about.

**The agent diagnoses this itself, unprompted.** Verbatim, mid-run, while trying
to swap two import lines:

> The read result is getting truncated in the transcript, but from the first
> tool result at the top of this conversation, I already know the exact content
> of the first 15 lines.

and, a minute later, naming the truncated field outright:

> The transcript is truncating the `content` field so I can't see the `hash`
> value. The initial system message gave me the hash:
> `sha256:9720087b…`. Let me use that.

That second quote is the whole defect in three sentences. The agent understands
its tools perfectly, correctly identifies what was lost, and then substitutes a
hash captured at session start — for a file that has been rewritten many times
since. The fallback is guaranteed to be stale, so the patch fails, so it reads
again, and the loop closes.

It is describing the defect accurately and then working around it from memory —
which is precisely the failure mode, because the memory it is falling back on is
the thing that decays. This is not a case of the model failing to understand its
tools.

**Fix.** Either exempt the identity fields of a `read`/`stat` result from
transcript truncation, or keep a small runtime-side map of `path -> current
hash` that `patch` consults when the model omits or stales the hash. The
information is already in the runtime; the model should not be the one carrying
it across turns in a lossy channel.

---

## Tier 2 — correctness and safety

### 2.1 Refuse edits that destroy a file (two occurrences, both recovered)

`routes.constants.ts` lost ~80 unrelated routes to an `update`.
`use-login-form.ts` went from 100 lines to 12 — the entire hook body deleted —
from a `patch` whose hunk spanned most of the file. Both broke working,
unrelated features. Both were caught only because the supervisor was watching
`git diff --numstat` on every write.

A size-delta check before applying — refuse or require confirmation when
`afterLines` are dramatically shorter than the `beforeLines` they replace — costs
nothing and would have prevented both. Detail in `OPEN_DEFECTS.md` §3.

### 2.2 Unblock `update`

`RECEIPT_ARGUMENT_MISMATCH` denies whole-file replace, which is the _correct_
tool for a small file the agent just authored. Forcing multi-hunk `patch` onto
such files is what produced the truncated requests in 1.4. Detail in
`OPEN_DEFECTS.md` §1.

### 2.3 Make `patch` survivable on non-ASCII

Six consecutive failures on three accented French lines, across three framings.
The error said only "context missing or ambiguous", which does not point at the
cause. Detail in `OPEN_DEFECTS.md` §4.

---

## Tier 3 — project-specific checks worth teaching the runtime

- **i18n completeness.** The agent declared 27 keys in `i18n.types.ts` and called
  24, with 12 name mismatches between the two. A check that the called `t()` key
  chain exists, and that all 13 locales carry the same key set, is mechanical.
  The repo already treats this as a hard rule; the runtime does not know it.
- **Barrel exports.** A new type in `types/*.types.ts` that is not re-exported
  from `types/index.ts` is invisible. Same class as 1.3.
- **Layering.** A hook in a `.tsx`, a `process.env` outside AppConfig, a Prisma
  call outside a repository — all stated in `CLAUDE.md`, none enforced at write
  time.

---

## What the agent did well, unaided

Worth recording, because it bounds the problem — these did not need a single
correction:

- Both **security properties** were implemented correctly on the first attempt:
  the forgot-password response is identical whether or not the address exists
  (`setHasSubmitted(true)` in _both_ `onSuccess` and `onError`), and the reset
  form distinguishes an invalid token without leaking why.
- It correctly did **not** touch `useAuthStore` from the reset flow.
- It **self-diagnosed** the `beforeLines`/`afterLines`-inside-`hunks` shape
  error correctly, in its own words, before being told.
- Given a **reshaped** instruction rather than a reworded one, it landed
  first-try every time. The early-return refactor succeeded immediately after
  eight failed attempts at the equivalent JSX restructure.

That last point is the strongest evidence for Tier 1: the model's reasoning was
rarely the bottleneck. The scaffolding around it was.

---

## Proposed acceptance test for "one-shot E2E"

The mission is complete when a **single** prompt of the form _"implement password
reset end-to-end, per the acceptance criteria in `<doc>`; gate, commit and push"_
produces a green, pushed branch with **zero** supervisor turns in between — on a
clean checkout, with the same model. Re-run it against this same feature, since
we now have a verified reference implementation to diff against.
