import { CHAIN_ACTION_CATALOG } from '../constants/chain-action-catalog.constants';
import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

export type NlDraftConnector = {
  id: string;
  provider: WorkspaceProvider;
};

export type ChainNlDraftPrompt = {
  systemPrompt: string;
  userPrompt: string;
};

// Phase 09 — turns the caller's real connectors into a menu the model can
// only pick from (real connectorIds, real actionTypes for that provider),
// plus the exact chainDslSchema shape it must produce. The model is asked
// for JSON only; chain-nl-draft.manager.ts is what actually enforces the
// schema (this is prompt guidance, not a validation guarantee).
export function buildChainNlDraftSystemPrompt(connectors: NlDraftConnector[]): string {
  const menu = connectors
    .map((connector) => {
      const actions = CHAIN_ACTION_CATALOG[connector.provider] ?? [];
      if (actions.length === 0) return null;
      const actionList = actions.map((a) => `${a.actionType} (${a.label})`).join(', ');
      return `- connectorId "${connector.id}" (${connector.provider}): ${actionList}`;
    })
    .filter((line): line is string => line !== null)
    .join('\n');

  return [
    'You turn a short natural-language request into a draft automation chain.',
    'Respond with ONLY a JSON object of this exact shape, no prose, no markdown fences:',
    '{"steps":[{"id":"string","connectorId":"string","actionType":"string","payload":{}}]}',
    '',
    'Rules:',
    '- 1 to 20 steps.',
    "- Each step's connectorId MUST be exactly one of the connector ids listed below — never invent one.",
    "- Each step's actionType MUST be one of the action types listed for that exact connector.",
    '- payload may be an empty object or a best-effort guess at fields (e.g. channel, text, summary,',
    '  projectKey) — the user will review and fill in details before saving, so partial payloads are fine.',
    '- If the request describes waiting for something to happen (a trigger) rather than an action to take',
    '  right now, still produce the write-action step(s) it implies; there is no "wait for" step type yet.',
    '- If nothing in the request maps to any available connector/action, return {"steps":[]}.',
    '',
    'The user has these connected accounts and their available actions:',
    menu.length > 0 ? menu : '(none)',
  ].join('\n');
}

export function buildChainNlDraftPrompt(
  connectors: NlDraftConnector[],
  prompt: string,
): ChainNlDraftPrompt {
  return {
    systemPrompt: buildChainNlDraftSystemPrompt(connectors),
    userPrompt: prompt,
  };
}

// Appended to the user prompt on a validation-failure retry, so the model
// sees exactly what it got wrong instead of repeating the same mistake.
export function buildChainNlDraftRetryPrompt(prompt: string, validationError: string): string {
  return [
    prompt,
    '',
    `Your previous response was invalid: ${validationError}`,
    'Respond again with ONLY the corrected JSON object, following the rules exactly.',
  ].join('\n');
}
