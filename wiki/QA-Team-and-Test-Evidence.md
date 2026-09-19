> **Canonical source:** `rules/49-qa-team-discipline-and-test-evidence.md`

# Rule 49 — You are the whole QA team, and you produce evidence

**Applies to**: every single change. UI, backend, API, behaviour, new feature,
bug fix, security control, performance work, benchmark, audit, refactor,
config, copy. There is no category that is exempt and no change that is "too
small". If you touched it, you test it.

**Related**: [rules/44](https://github.com/ihabkhaled/ClawAI/blob/main/rules/44-live-verification-before-done.md) (nothing is done
until it has been seen running — this rule says _who you must be_ while you look)
· [rules/41](https://github.com/ihabkhaled/ClawAI/blob/main/rules/41-web-evidence-truthfulness.md) ·
[rules/22](https://github.com/ihabkhaled/ClawAI/blob/main/rules/22-testing-and-coverage.md) ·
[rules/34](https://github.com/ihabkhaled/ClawAI/blob/main/rules/34-gate-economy-and-machine-resources.md) ·
[skills/run-the-qa-team.md](https://github.com/ihabkhaled/ClawAI/blob/main/skills/run-the-qa-team.md) ·
[skills/verify-a-batch-live.md](https://github.com/ihabkhaled/ClawAI/blob/main/skills/verify-a-batch-live.md)

---

## 1. Unit tests are the floor, not the ceiling

A green suite proves the code does what you thought. It does not prove the
feature works, that the container is serving your build, that the layout
survives on a tablet in portrait, that a free-plan user can still send a
message, or that the thing you sped up is actually faster.

Those are different questions, asked by different people. **On this repo you are
all of those people.** Nobody else is going to open the browser.

## 2. The team you must be

Every change is walked through each of these hats. Most hats take one minute and
find nothing; the rule exists because the one that finds something is never the
one you expected.

| Hat                           | The question it asks                                                            |
| ----------------------------- | ------------------------------------------------------------------------------- |
| **Manual tester**             | Did I open it and use it myself, as a person, not as a script?                  |
| **API tester**                | Real `curl` against the running service: status, body, headers, timing.         |
| **UI tester**                 | Does the rendered DOM carry the change — computed style, not source file?       |
| **UI/UX designer**            | Is it actually _pretty_? Spacing, alignment, contrast, hierarchy, empty states. |
| **Responsive engineer**       | Every platform, every orientation, **≥3 screen sizes each** (see §3).           |
| **UAT engineer**              | Does the user's real journey work end to end, not just my endpoint?             |
| **QA engineer / validator**   | Acceptance criteria, one by one, each with its own evidence line.               |
| **Regression tester**         | The states I did **not** change: are they still correct?                        |
| **Risk engineer**             | What is the worst thing this can do? Which path did I not test?                 |
| **Automation tester**         | Is this now covered by a test that runs without me?                             |
| **Business / product tester** | Does it do what the user asked for, in their words, not my paraphrase?          |
| **Security / pen tester**     | Authz bypass, IDOR, injection, leaked token, enumeration, unsafe default.       |
| **RBAC tester**               | Every role AND every plan tier: admin, user, **free**, paid, trial, expired.    |
| **Performance tester**        | Latency and payload before vs after, measured, not assumed.                     |
| **Stress tester**             | Concurrency, repeat calls, big inputs, slow dependency, dependency down.        |
| **Analysis / plan tester**    | Did the plan's stated deliverables all land, or did scope quietly shrink?       |

## 3. The device matrix is not negotiable

Any change that reaches a screen is validated on **at least three widths per
platform, in both orientations where the device has them**:

| Platform | Widths to prove         | Orientations        |
| -------- | ----------------------- | ------------------- |
| Mobile   | 360 · 390 · 430         | portrait, landscape |
| Tablet   | 768 · 820 (iPad) · 1024 | portrait, landscape |
| Desktop  | 1280 · 1440 · 1920      | —                   |

At every one of them: no horizontal scroll, no overlap, no clipped text, nothing
under a fixed bar, tap targets reachable, and the navigation present. Tablets are
the trap — they satisfy `touch:` **and** `md:` at once, which is how the sidenav
disappeared on iPad while every phone and desktop check passed.

RTL is part of the matrix, not an afterthought: check one Arabic locale at one
width per platform.

## 4. Evidence, or it did not happen

A claim without evidence is not a result. Every verification produces something
another person could re-run or look at:

- the **exact command** and its real output (status code, body, log line),
- a **screenshot** for anything visual, per breakpoint,
- the **log line** that proves the branch you intended was the branch taken,
- for performance, **two numbers** — before and after — not an adjective.

Evidence goes in the batch report you give the user. "Tested and working" with
nothing behind it is a prohibited sentence, and so is reporting a check you did
not actually run.

**Never fabricate, predict, or assume a result.** If a lane could not be run —
no browser, no credentials, a service down — say exactly that, say which lane,
and say what is therefore unproven. An honestly skipped lane is acceptable; an
imagined one is not.

## 5. Automate what you just did by hand

Manual validation finds it; an automated test keeps it found. Anything you
verified by hand that _can_ be expressed as a test gets one in the **same batch**
— Playwright for a flow, a spec for a unit, a scripted `curl` for a contract.
Otherwise the next agent re-finds the same bug by hand, or does not find it.

## 6. Where this sits against the gates

This rule is about _proving the feature_; [rules/34](https://github.com/ihabkhaled/ClawAI/blob/main/rules/34-gate-economy-and-machine-resources.md)
is about _paying for the gates once_. They do not conflict:

- QA validation runs against the **already-running stack** while you work.
- Lint / typecheck / test / build run **once, at the end, scoped** to what you
  touched ([rules/48](https://github.com/ihabkhaled/ClawAI/blob/main/rules/48-lint-and-test-only-what-changed.md)).

Re-running a proven-green gate is waste. Skipping the QA walk is not a saving —
it is the defect reaching the user.

