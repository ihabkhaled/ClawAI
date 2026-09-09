import { PromptGuideTopic } from '@/enums/prompt-guide-topic.enum';

/**
 * `/prompts` is a brand-new top-level hub. Confirmed clear of
 * `PRIVATE_ROUTE_PREFIXES` (`src/constants/private-route-prefixes.constants.ts`)
 * before this cluster was built — no `/models`-style collision to work
 * around here.
 */
export const PROMPTS_HUB_PATH = '/prompts';
export const PROMPTS_HUB_SLUG = 'prompts';

/**
 * When the claims on these pages were last checked against
 * `/learn/why-ai-hallucinates`, `/learn/what-is-prompt-injection`,
 * `/learn/what-are-structured-ai-outputs` and the `/model-fit` cluster (the
 * pages this cluster cross-links instead of re-explaining). Move this ONLY
 * after re-checking all four.
 */
export const PROMPTS_REVIEW_DATE = '2026-09-09';

/**
 * Render order on the hub, and generation order for the dynamic route.
 * Fundamentals first, then two core techniques (few-shot, chain-of-thought),
 * then the structured-output companion piece, then the system/user prompt
 * distinction, then debugging a bad result, and finally how the approach
 * changes by task type — the most "put it all together" topic, last.
 */
export const PROMPT_GUIDE_TOPIC_ORDER: ReadonlyArray<PromptGuideTopic> = [
  PromptGuideTopic.WRITING_CLEAR_PROMPTS,
  PromptGuideTopic.FEW_SHOT_PROMPTING,
  PromptGuideTopic.CHAIN_OF_THOUGHT_PROMPTING,
  PromptGuideTopic.PROMPTING_FOR_STRUCTURED_OUTPUT,
  PromptGuideTopic.SYSTEM_PROMPTS_VS_USER_PROMPTS,
  PromptGuideTopic.ITERATING_ON_A_PROMPT,
  PromptGuideTopic.PROMPTING_BY_TASK_TYPE,
];

export function getPromptGuideTopicPath(topic: PromptGuideTopic): string {
  return `${PROMPTS_HUB_PATH}/${topic}`;
}

export function getPromptGuideTopicSlug(topic: PromptGuideTopic): string {
  return `${PROMPTS_HUB_SLUG}/${topic}`;
}

/**
 * Related pages per topic, editorial rather than computed. Cross-links to
 * already-built, already-verified pages rather than re-explaining their
 * content: `/learn/what-are-structured-ai-outputs` (structured output),
 * `/learn/why-ai-hallucinates` and `/learn/what-is-prompt-injection`
 * (honesty about what prompting cannot fix), and the `/model-fit` cluster
 * (how the right model, not just the right prompt, changes by task).
 */
export const PROMPT_GUIDE_RELATED_PATHS: Readonly<Record<PromptGuideTopic, ReadonlyArray<string>>> =
  {
    [PromptGuideTopic.WRITING_CLEAR_PROMPTS]: [
      '/prompts/system-prompts-vs-user-prompts',
      '/prompts/iterating-on-a-prompt',
      '/learn/why-ai-hallucinates',
    ],
    [PromptGuideTopic.FEW_SHOT_PROMPTING]: [
      '/prompts/writing-clear-prompts',
      '/prompts/prompting-for-structured-output',
      '/learn/what-are-ai-tokens',
    ],
    [PromptGuideTopic.CHAIN_OF_THOUGHT_PROMPTING]: [
      '/prompts/prompting-by-task-type',
      '/model-fit/complex-reasoning',
      '/learn/why-ai-hallucinates',
    ],
    [PromptGuideTopic.PROMPTING_FOR_STRUCTURED_OUTPUT]: [
      '/learn/what-are-structured-ai-outputs',
      '/prompts/few-shot-prompting',
      '/prompts/writing-clear-prompts',
    ],
    [PromptGuideTopic.SYSTEM_PROMPTS_VS_USER_PROMPTS]: [
      '/prompts/writing-clear-prompts',
      '/learn/what-is-prompt-injection',
      '/prompts/iterating-on-a-prompt',
    ],
    [PromptGuideTopic.ITERATING_ON_A_PROMPT]: [
      '/prompts/writing-clear-prompts',
      '/learn/why-ai-hallucinates',
      '/prompts/few-shot-prompting',
    ],
    [PromptGuideTopic.PROMPTING_BY_TASK_TYPE]: [
      '/model-fit',
      '/model-fit/coding',
      '/model-fit/writing-and-editing',
    ],
  };

export function isPromptGuideTopic(value: string): value is PromptGuideTopic {
  return (Object.values(PromptGuideTopic) as string[]).includes(value);
}
