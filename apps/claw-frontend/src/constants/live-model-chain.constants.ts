import { LiveModelChainKind, LiveModelStyle } from '@/enums/live-model-chain.enum';
import type { LiveModelChainEditorOption, LiveModelRef } from '@/types/live-admin.types';

/**
 * The connectors claw-live-service can call, and how (LiveModelClient): cloud Ollama on its native
 * `/api/chat`, Gemini on its OpenAI-compatible `/openai` surface. Any other provider cannot be
 * expressed in the policy, so the picker shows it disabled.
 */
export const LIVE_MODEL_STYLE_BY_CONNECTOR: Readonly<Record<string, LiveModelStyle>> = {
  OLLAMA: LiveModelStyle.OLLAMA,
  GEMINI: LiveModelStyle.OPENAI_COMPAT,
};

/** Picker group for a stored model the catalogue no longer lists. */
export const LIVE_MODEL_CURRENT_GROUP_KEY = 'live-current';

/** What an older version without councilModelChain runs with (the live-service schema default). */
export const LIVE_COUNCIL_DEFAULT_CHAIN: ReadonlyArray<LiveModelRef> = [
  { connector: 'GEMINI', model: 'gemini-3.1-flash-lite', style: LiveModelStyle.OPENAI_COMPAT },
];

/** The three chain editors, in display order, with the live-service schema limits. */
export const LIVE_MODEL_CHAIN_EDITORS: ReadonlyArray<LiveModelChainEditorOption> = [
  {
    kind: LiveModelChainKind.SUMMARY,
    min: 1,
    max: 5,
    titleKey: 'live.admin.summaryChainTitle',
    hintKey: 'live.admin.summaryChainHint',
    addKey: 'live.admin.addFallback',
  },
  {
    kind: LiveModelChainKind.VISION,
    min: 1,
    max: 5,
    titleKey: 'live.admin.visionChainTitle',
    hintKey: 'live.admin.visionChainHint',
    addKey: 'live.admin.addFallback',
  },
  {
    kind: LiveModelChainKind.COUNCIL,
    min: 1,
    max: 3,
    titleKey: 'live.admin.councilChainTitle',
    hintKey: 'live.admin.councilChainHint',
    addKey: 'live.admin.addAgent',
  },
];
