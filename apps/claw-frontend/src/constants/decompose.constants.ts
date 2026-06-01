// User-selectable max sub-task counts on the Decompose lab. The router
// asks for an integer between 2 and 5 — picking >5 explodes the prompt
// tokens and ends up timing out the sub-task synthesizer, so we cap on
// the UI side and let the backend re-validate.
export const DECOMPOSE_MAX_SUB_TASK_OPTIONS: ReadonlyArray<number> = [2, 3, 4, 5];

// Default sub-task count when the user has not picked one yet. Three is
// the sweet spot the prompt has been tuned against (1 research / 1 plan
// / 1 summary), so we lead the user there.
export const DECOMPOSE_DEFAULT_MAX_SUB_TASKS = 3;

// Stable IDs for the synthetic OrchestrationStage rows the decompose
// controller hook emits as the run progresses. These IDs are React keys
// and MUST NOT change between renders — that is the whole reason they
// live in a constants file instead of being inlined in the hook.
//
// Visual order (top → bottom in the timeline):
//   1. submit  → "Submitting task" — request fired, awaiting threadId
//   2. plan    → "Planning sub-tasks" — backend is decomposing
//   3. execute → "Executing sub-tasks" — sub-task agents running
//   4. result  → "Synthesizing answer" — final synthesis writing
//
// When backend later adds real `orchestration_stage` SSE events, the
// hook can swap in real IDs without touching the timeline component.
export const DECOMPOSE_STAGE_ID_SUBMIT = 'decompose:submit';
export const DECOMPOSE_STAGE_ID_PLAN = 'decompose:plan';
export const DECOMPOSE_STAGE_ID_EXECUTE = 'decompose:execute';
export const DECOMPOSE_STAGE_ID_RESULT = 'decompose:result';
