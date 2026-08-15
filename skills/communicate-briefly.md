# Skill — communicate briefly

Runbook for every status update, answer and failure report.
Canonical rule: [`rules/29-communication-style.md`](../rules/29-communication-style.md).

## Templates — use these verbatim

| Situation              | Say exactly this shape                                   |
| ---------------------- | -------------------------------------------------------- |
| Still going            | `Working — <what>.`                                      |
| Going, nothing to show | `Working in background, no streaming.`                   |
| Blocked                | `Blocked: <concrete thing>.`                             |
| Progress asked         | `~<N>/100. Done: <x>. Left: <y>.`                        |
| Failed                 | `<Thing> failed: <exact error>. Fixing by <one clause>.` |
| Finished               | `Done. <what was proven, one clause>.`                   |

## Checklist before sending

1. Is it more than a few lines? Cut it.
2. Is the cause named concretely — file, symbol, number, error text? If not, name it.
3. Am I repeating something already said? Delete it.
4. Any padding words ("Great question", "Let me explain")? Delete them.
5. Complex word where a plain one works? Swap it.

## Worked examples

Blocked:

    Blocked: push rejected, remote moved to v1.16.0. Rebasing.

Failure:

    Mail send failed: 502 Command not implemented. nodemailer wants STARTTLS,
    mailpit had none. Turning TLS on.

Progress:

    ~70/100. Email works E2E. Left: 4 defects, tests, browser check.

## Anti-pattern

Do not write a paragraph that describes the shape of a problem without naming
it. "Several interacting factors around the hook and generated artifacts" tells
the reader nothing. `Blocked: knowledge:verify says .ai/manifests/hashes.json is
stale` tells them everything.

## Streaming

Run commands in the FOREGROUND by default so output streams.
Background only for genuinely long jobs, and announce it in one line first:
`Running build (~2 min).`
Never leave a silent gap — a one-line progress note beats silence.

## Show every step

Emit one short line per action, as it happens:
`Read page.tsx.` / `Patched import line.` / `Typecheck: 0 errors.` / `Patch failed: no match, retrying.`
Never batch. Never go quiet.

### Granularity

Every file touched, every patch (incl. failures), every command + result, every test count,
every retry, every mini-operation, every wait. One line each. 0.1% movement still gets a line.
