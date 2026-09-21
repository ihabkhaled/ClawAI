/**
 * How much conversation an orchestration mode reads.
 *
 * A chat turn fetches `THREAD_HISTORY_FETCH_LIMIT` (400) and lets the composer
 * fit what the window allows. The modes have always used 20, and this keeps
 * that number while the duplicated builders are consolidated, so consolidating
 * them cannot change what any mode sends or what it costs.
 *
 * Raising it to match chat is a deliberate, separately measurable change — it
 * moves token spend on every compare, consensus and escalation run — so it
 * belongs to the batch that makes the modes context-complete, not to the one
 * that removes three copies of the same code.
 */
export const MODE_HISTORY_MESSAGE_LIMIT = 20;
