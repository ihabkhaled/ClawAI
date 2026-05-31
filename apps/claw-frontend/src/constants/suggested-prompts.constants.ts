// Static catalog of "suggested starter prompts" rendered in the chat thread
// list empty state and the desktop right-hand-side prompt for the user with
// zero threads. The labels are i18n KEYS — the consuming component resolves
// each key with `t()` so all 9 locales translate at render time. Keeping the
// keys (not the resolved strings) here means we can change locale catalogs
// without touching React components.
import type { SuggestedPrompt } from '@/types';

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'summarize',
    label: 'chat.suggestedPrompts.summarizeLabel',
    prompt: 'chat.suggestedPrompts.summarizePrompt',
  },
  {
    id: 'brainstorm',
    label: 'chat.suggestedPrompts.brainstormLabel',
    prompt: 'chat.suggestedPrompts.brainstormPrompt',
  },
  {
    id: 'explain',
    label: 'chat.suggestedPrompts.explainLabel',
    prompt: 'chat.suggestedPrompts.explainPrompt',
  },
  {
    id: 'code',
    label: 'chat.suggestedPrompts.codeLabel',
    prompt: 'chat.suggestedPrompts.codePrompt',
  },
];
