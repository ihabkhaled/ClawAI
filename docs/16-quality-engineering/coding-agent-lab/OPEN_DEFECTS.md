# Coding Agent — open defects observed in the live lab

Two candidates found while supervising the password-reset mission on
2026-08-13. Neither is fixed yet; both are recorded with the evidence that
produced them so the next session does not have to rediscover them.

## 1. `RECEIPT_ARGUMENT_MISMATCH` blocks `workspace.files update`

**Symptom.** An `update` on a file the agent itself authored is denied with

    Runtime transition was denied: RECEIPT_ARGUMENT_MISMATCH (RUNTIME_TRANSITION_DENIED)

and the write does not land. Observed twice in a row on
`apps/claw-frontend/src/components/auth/forgot-password-form.tsx` (57 lines).
`patch` on the same file in the same run succeeds, so the block is specific to
the `update` path rather than to the file or the run.

**Where the denial comes from.** `RUNTIME_V2_RESULT_SCRIPT` in
`apps/claw-chat-service/src/infrastructure/redis/constants/runtime-v2-redis-scripts.constants.ts`:

    local verification = cjson.decode(ARGV[5])
    if invocationArgumentHash ~= verification.argumentHash then
      return {'DENIED', 'RECEIPT_ARGUMENT_MISMATCH'}
    end

`invocationArgumentHash` is recorded when the invocation is admitted.
`verification.argumentHash` is computed extension-side in
`src/core/runtime/runtime-tool-result.ts:206` as `sha256(invocation.arguments)`.
The two must be byte-identical hashes of the same argument object.

**Not yet ruled out.** Whether the two sides canonicalise the argument object
identically (key ordering, number formatting) for the argument shapes an
`update` produces. `normalizeTransactionEncoding` was checked and is NOT the
cause: it builds a new object and does not mutate `invocation.arguments`, so
the hashed value is unchanged.

**Impact.** The agent cannot use whole-file replace. That matters because
`update` is the correct tool for a small file the agent authored itself, and
forcing multi-hunk `patch` on such files is what produced several wasted turns
and one truncated request in this mission.

## 2. `targetId` is stripped after the argument hash is taken

`normalizeToolInvocationForAdmission`
(`src/core/runtime/runtime-tool-normalization.ts:75`) removes `targetId` from
`arguments` for `workspace.command` v2.0.0:

    return { ...invocation, arguments: Object.fromEntries(
      Object.entries(invocation.arguments).filter(([key]) => key !== 'targetId')) };

The receipt then hashes the STRIPPED arguments, while the backend recorded the
hash of what the model actually sent — which still contained `targetId`. That
is the same equality check as defect 1, so every `workspace.command` invocation
carrying `targetId` in `arguments` should fail it.

**Status.** Reasoned from the code, NOT reproduced in the lab — the mission had
no `workspace.command` call carrying `targetId`. Verify before fixing.

## Already fixed and shipped from this mission

- **v0.59.2** — argument rejections now name the valid sibling keys instead of
  only the offending one.
- **v0.59.3** — `search` no longer requires a `pattern`; it defaults to `**/*`.

## 3. Whole-file destruction via `patch` — SECOND occurrence

`apps/claw-frontend/src/hooks/auth/use-login-form.ts` was reduced from 100
lines to 12 lines of imports: the entire hook body and its `export function
useLoginForm` were removed. That broke `login-form.tsx`, which imports it —
so a working, unrelated feature (login) was taken down by an edit whose only
intent was to change one click handler.

Recovered with `git checkout HEAD -- <path>`; the agent's earlier legitimate
change on that file (toast -> router.push) was lost with it and must be redone.

This is the same failure as the earlier `routes.constants.ts` incident, where
about 80 unrelated routes were replaced with hallucinated ones. That one came
from `update` (whole-file replace). This one happened while the agent was
restricted to `patch`, so a `patch` whose `beforeLines` span most of a file is
just as destructive — the hunk matched a large region and the `afterLines`
replaced it with only the import block.

**Mitigation that worked in this mission:** verify every write with `git diff
--numstat` immediately, and treat a large deletion count on a file the change
should not shrink as an incident, not a style nit. The live monitor used here
flags any diff with more than 30 deleted lines.

**Worth considering in the product:** a guard that refuses, or requires
explicit confirmation for, a single hunk whose `beforeLines` exceed some large
fraction of the file, or whose `afterLines` are dramatically shorter than the
`beforeLines` they replace. The atomic-edit machinery is already there; what is
missing is a size-delta sanity check before the write is applied.

## 4. `patch` cannot reliably edit lines containing non-ASCII text

Three lines in `src/lib/i18n/locales/fr.ts` combined an apostrophe with
accented characters:

    forgotPasswordErrorGeneric: 'Une erreur s'est produite. Veuillez réessayer.',

Six consecutive `patch` attempts failed to match them, across three different
framings (three hunks in one call, three separate single-line calls, and
anchoring on the key name instead of the value). The same agent patched dozens
of pure-ASCII lines in the same session without trouble, so the differentiator
is the non-ASCII content: the model does not reproduce `é` byte-exactly in a
hunk, and `applyExactHunks` requires an exact match.

**What worked:** routing the edit through `workspace.command` with an ASCII-only
`sed` pattern, then restoring the accent with a `é` escape in a `node -e`
one-liner. Errors went 29 -> 2 immediately.

**Worth considering in the product:** `patch` failures currently say only that
the context is "missing or ambiguous". When the target line contains non-ASCII
characters and the supplied `before` differs from it only in those bytes, the
error could say so — that single hint would have saved six attempts. A
normalising comparison (for example NFC/NFD-insensitive matching) may also be
worth evaluating, since editors and models disagree about Unicode normalisation
more often than they disagree about ASCII.
