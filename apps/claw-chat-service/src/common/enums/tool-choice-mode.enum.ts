// How hard the provider is pushed to emit a tool call on a given turn.
//
// AUTO     — the model decides. The normal setting for every turn.
// REQUIRED — the provider must emit a tool call; a text reply becomes
//            structurally impossible for that turn. This is the strongest
//            available anti-drift lever, and it MUST be released after a
//            single turn or the run can never produce a final answer.
// NONE     — the model must not call a tool (used for wrap-up turns).
//
// Native Ollama `/api/chat` does not implement forced tool choice, so
// REQUIRED degrades to AUTO on that dialect — see resolveToolChoicePayload.
export enum ToolChoiceMode {
  AUTO = 'AUTO',
  REQUIRED = 'REQUIRED',
  NONE = 'NONE',
}
