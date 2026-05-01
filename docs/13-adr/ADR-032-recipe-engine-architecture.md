# ADR-032: Recipe / Workflow Engine Architecture

- **Status**: Accepted
- **Date**: 2026-04-26
- **Author**: Desktop Agent Flagship working group

## Context

A "recipe" is the unit of value for the desktop agent — a savable, replayable, parametrised sequence of capability invocations that solves a real user problem (organise Downloads, transcribe meeting + summarise, fill expense report from receipts folder). Without recipes the agent is a series of one-off approvals.

## Decision

A typed YAML/JSON DSL describes each recipe as a DAG of capability calls. The engine has three primary surfaces:

1. **DSL** (`recipeDslSchema` in `apps/claw-agent-service/src/modules/recipes/dto/recipe-dsl.dto.ts`) — Zod-validated. Steps reference each other by `id`. Supports parameters (typed: string / number / boolean / path / select / date), per-step `when`, `on_success` (next-step IDs), `on_error` (`abort` | `continue` | retry | fallback to step ID), `parallel_group`, `timeout_ms`. Hard caps: 100 steps per run, 5 parallel-group concurrency, 600s wall-clock per step, 10min total run.
2. **Safe expression evaluator** (`recipe-expression.utility.ts`) — a 500-LOC handwritten parser that supports ONLY: `$params.<name>`, `$steps.<id>.output[.<path>]`, string/number/boolean/null literals, `==`/`!=`/`===`/`!==`/`>`/`>=`/`<`/`<=`, `&&` / `||` / `!`, `~=` (regex match). NO function calls, NO member access via brackets, NO eval / new Function / vm. Tested against 30+ injection vectors (`constructor.constructor("alert(1)")()`, prototype pollution, base64-encoded payloads, polyglot strings). Any token outside the grammar throws `RecipeExpressionParseError`.
3. **DAG runner** (`RecipeRunner`, planned in stream-13) — walks the DAG topologically, calls stream-10 capability framework for each step, observes per-step `on_error` directive (retry with exponential backoff up to 5 attempts, fallback to a named step, abort, or continue). Records each step's `output` keyed by step ID so later steps can reference via `$steps.<id>.output.<path>`. On run failure the `RecipeRollbackManager` walks completed steps in reverse calling stream-10 rollback on each.

## Consequences

**Positive**
- One DSL covers linear, branching, parallel recipes uniformly.
- Per-step approval still goes through the capability framework — recipes don't bypass safety. (An entire recipe that consists of LOW-risk operations runs end-to-end with no human approvals if every individual step's policy auto-approves.)
- Safe expression evaluator means user / marketplace recipes can compute conditions without us shipping eval.
- Rollback chain reuses stream-10's per-capability undoPlan — no separate rollback engine.

**Negative**
- 100-step cap and 600s wall-clock will sometimes annoy power users running long backups or batch transcriptions; admins can raise via env.
- The expression evaluator is bespoke — bugs in the evaluator are bugs in the DSL. Mitigated by extensive unit tests + the strict grammar (no surface area for "unexpected" behaviour).

## Alternatives Considered

- **JavaScript-based DSL evaluated in `vm`** — rejected: the canonical XSS / RCE attack surface. Even sandboxed `vm` has known escapes.
- **Lua / Python embedded** — rejected: doubles the runtime footprint and the attack surface; recipes don't need a Turing-complete language.
- **No expressions — only literal values** — rejected: most useful recipes need at least conditional skip and value passing between steps. The grammar above is the smallest grammar that supports those without inviting code execution.

## References

- Stream prompt: `plan-prompts/clawai_desktop_agent_flagship/13-stream-foundation-recipe-workflow-engine.md`
- DSL schema: `apps/claw-agent-service/src/modules/recipes/dto/recipe-dsl.dto.ts`
- Types: `apps/claw-agent-service/src/modules/recipes/types/recipe.types.ts`
- Constants: `apps/claw-agent-service/src/common/constants/recipe.constants.ts`
- Expression evaluator: `apps/claw-agent-service/src/common/utilities/recipe-expression.utility.ts`
