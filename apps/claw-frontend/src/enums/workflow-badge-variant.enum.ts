// Render variant for the chat workflow badge. `LIVE` means the workflow
// is wired end-to-end (DIRECT_LLM, SEARCH_FIRST today). `UNAVAILABLE`
// means the routing-service emitted a workflow kind the FE does not yet
// have an executor for — we still render an honest pill so the user
// sees the truth instead of a silent fallthrough.

export enum WorkflowBadgeVariant {
  LIVE = 'LIVE',
  UNAVAILABLE = 'UNAVAILABLE',
}
