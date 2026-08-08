# Root cause of the 0-of-21 result — 2026-08-08

The 2026-08-07 screen reported 0 of 21 hosted models executing a tool, with 17
identical `workspace.files list` failures. `0.56.0` surfaced the executor's
reason; `0.56.1` let the model act on a failed tool instead of the run dying
with it. With both in place, the remaining failure was reproduced and traced.

## The workspace never existed

The harness (and the interactive serve-web session it inherited) opened

```text
http://127.0.0.1:9888/?folder=d:/Freelance/Claw
```

`d:` parses as a URI **scheme**, not a drive letter. The drive was dropped and
the extension host resolved the workspace folder to `\Freelance\Claw`, which
the VS Code Git extension log shows resolving against the C: drive:

```text
[Model][getRepositoryExact] Failed to get repository realpath for:
"\Freelance\Claw". Error: ENOENT: no such file or directory, realpath
'C:\Freelance\Claw'
```

Every `workspace.files` call against that root fails in ~20 ms — identically,
for every model — because the root does not exist. Seventeen models were
screened against a workspace that was never there.

## Why Workspace Trust looked innocent and was still involved

Trust granted in that state attaches to the phantom folder, so the badge read
`Trusted` while the session was broken — which is why the 2026-08-07 round
correctly rejected trust as the root cause. After correcting the folder to
path form:

```text
http://127.0.0.1:9888/?folder=/d:/Freelance/Claw
```

the badge dropped to `Restricted` — the REAL folder had never been trusted.
Granting trust to `D:\Freelance\Claw` completed the repair.

## Verification

Same prompt, same model (`kimi-k2.6:cloud`), extension `0.56.1`:

```text
workspace.files · list succeeded · 1889 bytes in 14 ms
answer: 60
```

`PASS_TOOL_EXECUTED` on the first previously-failing model retested.

## What 0.56.1 contributed

Before the folder fix, the same screen against the broken root showed the new
lifecycle behaviour working exactly as designed: 18 consecutive
`workspace.files list` failures, each returned to the model with its reason
(266 bytes rather than 166), each answered by a model retry, bounded and ended
by the model-turn budget — instead of the pre-0.56.1 behaviour, where the
first failure silently cancelled the run before the model could react.

The harness constant is fixed in `model-matrix.mjs` in this directory.
