# Model conformance screen - 2026-08-07

Every hosted (cloud) model the extension offers, screened against the real
extension in a real VS Code window by `model-matrix.mjs`. The prompt can only be
satisfied by calling a tool, so a model that narrates instead of calling has
failed the screen. This measures whether a model can drive the agent at all, not
how clever it is.

Extension `0.55.0`. Local stack, all containers healthy, Workspace Trust granted.

## Result: 0 of 21 executed a tool

- 17 x `FAIL_TOOL_EXECUTION`
- 4 x `FAIL_NO_TOOL_CALL`

**17 models emitted a valid `workspace.files list` request that the runtime
accepted and executed, and it failed identically - 166 bytes, about 15 ms - every
time.** Seventeen different models producing one identical failure is a product
defect, not a model problem. That retires the theory that the benchmark was
blocked on model capability.

Four returned `CLOUD_PROVIDER_EMPTY_RESPONSE`. That is a separate provider-level
problem and not the same finding.

Workspace Trust is **not** the cause. The badge read `Trusted` and the failure was
unchanged. The previous round predicted trust and was wrong.

## Per model

| Model                  | Outcome               | Wall clock |
| ---------------------- | --------------------- | ---------- |
| `kimi-k2.7-code:cloud` | `FAIL_TOOL_EXECUTION` | 4s         |
| `kimi-k2.6:cloud`      | `FAIL_TOOL_EXECUTION` | 8s         |
| `deepseek-v4-flash`    | `FAIL_TOOL_EXECUTION` | 4s         |
| `deepseek-v4-pro`      | `FAIL_TOOL_EXECUTION` | 4s         |
| `gemma4:31b`           | `FAIL_TOOL_EXECUTION` | 22s        |
| `glm-5.1`              | `FAIL_TOOL_EXECUTION` | 6s         |
| `glm-5.2`              | `FAIL_TOOL_EXECUTION` | 6s         |
| `gpt-oss:120b`         | `FAIL_TOOL_EXECUTION` | 8s         |
| `gpt-oss:20b`          | `FAIL_NO_TOOL_CALL`   | 8s         |
| `kimi-k2.5`            | `FAIL_NO_TOOL_CALL`   | 4s         |
| `kimi-k2.6`            | `FAIL_TOOL_EXECUTION` | 8s         |
| `kimi-k2.7-code`       | `FAIL_TOOL_EXECUTION` | 6s         |
| `kimi-k3`              | `FAIL_NO_TOOL_CALL`   | 4s         |
| `minimax-m2.5`         | `FAIL_NO_TOOL_CALL`   | 4s         |
| `minimax-m2.7`         | `FAIL_TOOL_EXECUTION` | 12s        |
| `minimax-m3`           | `FAIL_TOOL_EXECUTION` | 8s         |
| `mistral-large-3:675b` | `FAIL_TOOL_EXECUTION` | 14s        |
| `nemotron-3-nano:30b`  | `FAIL_TOOL_EXECUTION` | 10s        |
| `nemotron-3-super`     | `FAIL_TOOL_EXECUTION` | 12s        |
| `nemotron-3-ultra`     | `FAIL_TOOL_EXECUTION` | 10s        |
| `qwen3.5:397b`         | `FAIL_TOOL_EXECUTION` | 10s        |

## What changed because of this

`0.56.0` stops `RuntimeToolDispatcher` discarding the executor's reason: it caught
failures with a bare `catch` and substituted one fixed sentence, "The trusted tool
executor failed." The same failure now reports 266 bytes instead of 166 - the
reason, in transit.

## Still open

The run terminalizes as `cancelled` after a non-retryable tool failure, so the
model never gets a turn to report the reason and the message stays off every
surface a reviewer can read. That is why the error was invisible in the first
place, and it is the next fix.

Reproduce with:

```
CLAW_LAB_EMAIL=... CLAW_LAB_PASSWORD=... CLAW_LAB_PROFILE=... \
  node docs/16-quality-engineering/coding-agent-lab/model-matrix.mjs
```
