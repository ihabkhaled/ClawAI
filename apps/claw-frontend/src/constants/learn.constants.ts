import { LearnTopic } from '@/enums/learn-topic.enum';

/** The hub. */
export const LEARN_HUB_PATH = '/learn';

/** Registry slug for the hub. Children are `learn/<topic>`. */
export const LEARN_HUB_SLUG = 'learn';

/**
 * When the concepts on these pages were last checked.
 *
 * These describe how the techniques work, not what a named vendor ships, so
 * they age far more slowly than `/compare/*`. They still carry a visible date:
 * an explainer with no date is indistinguishable from an abandoned one, and
 * `dateModified` in the structured data has to come from somewhere honest.
 *
 * Move this ONLY after re-reading the pages. Moving it as part of an unrelated
 * edit makes stale content look freshly reviewed, which is worse than an old
 * date.
 */
export const LEARN_REVIEW_DATE = '2026-08-30';

/**
 * Render order on the hub, and the order children are generated in.
 *
 * Grouped by the question a reader is actually asking, easiest first: what the
 * field is, then the orchestration techniques, then context and memory, then
 * the local/self-hosted cluster, then the two comparisons. A reader landing on
 * any one page sees the neighbours that make sense next to it.
 */
export const LEARN_TOPIC_ORDER: ReadonlyArray<LearnTopic> = [
  LearnTopic.WHAT_IS_MULTI_MODEL_AI,
  LearnTopic.WHAT_IS_LLM_ORCHESTRATION,
  LearnTopic.WHAT_IS_AI_MODEL_ROUTING,
  LearnTopic.WHAT_IS_MODEL_FALLBACK,
  LearnTopic.WHAT_IS_AI_CONSENSUS,
  LearnTopic.WHAT_IS_BEST_OF_N,
  LearnTopic.WHAT_IS_AN_AI_JUDGE,
  LearnTopic.WHAT_IS_AI_ANSWER_VERIFICATION,
  LearnTopic.WHAT_IS_A_CONTEXT_WINDOW,
  LearnTopic.WHAT_IS_RAG,
  LearnTopic.WHAT_IS_AI_MEMORY,
  LearnTopic.WHAT_ARE_CONTEXT_PACKS,
  LearnTopic.WHAT_IS_LOCAL_AI,
  LearnTopic.WHAT_ARE_OPEN_WEIGHT_MODELS,
  LearnTopic.WHAT_IS_SELF_HOSTED_AI,
  LearnTopic.OLLAMA_VS_LLAMACPP,
  LearnTopic.CLOUD_AI_VS_LOCAL_AI,
  LearnTopic.AI_AGENT_VS_AI_CHATBOT,
];

/** `/learn/<topic>` for one topic. */
export function getLearnTopicPath(topic: LearnTopic): string {
  return `${LEARN_HUB_PATH}/${topic}`;
}

/** Registry slug for one topic. The slug is the path minus its leading slash. */
export function getLearnTopicSlug(topic: LearnTopic): string {
  return `${LEARN_HUB_SLUG}/${topic}`;
}

/**
 * The related pages shown at the foot of every topic.
 *
 * Deliberately a map rather than a rule: "related" is an editorial judgement,
 * and a computed neighbour list (previous/next in the order array) produces
 * links that are adjacent but not relevant. Each topic names the ClawAI pages a
 * reader of THAT concept should go to next.
 *
 * Paths only — these resolve through `localisePath`, so a reader never leaves
 * their locale.
 */
export const LEARN_RELATED_PATHS: Readonly<Record<LearnTopic, ReadonlyArray<string>>> = {
  [LearnTopic.WHAT_IS_MULTI_MODEL_AI]: ['/features', '/supported-models', '/compare'],
  [LearnTopic.WHAT_IS_LLM_ORCHESTRATION]: ['/features', '/how-it-works', '/architecture'],
  [LearnTopic.WHAT_IS_AI_MODEL_ROUTING]: ['/how-it-works', '/features', '/supported-models'],
  [LearnTopic.WHAT_IS_MODEL_FALLBACK]: ['/how-it-works', '/architecture', '/features'],
  [LearnTopic.WHAT_IS_AI_CONSENSUS]: ['/features', '/use-cases', '/pricing'],
  [LearnTopic.WHAT_IS_BEST_OF_N]: ['/features', '/use-cases', '/pricing'],
  [LearnTopic.WHAT_IS_AN_AI_JUDGE]: ['/features', '/use-cases', '/how-it-works'],
  [LearnTopic.WHAT_IS_AI_ANSWER_VERIFICATION]: ['/features', '/how-it-works', '/use-cases'],
  [LearnTopic.WHAT_IS_A_CONTEXT_WINDOW]: ['/supported-models', '/features', '/pricing'],
  [LearnTopic.WHAT_IS_RAG]: ['/features', '/use-cases', '/security-and-privacy'],
  [LearnTopic.WHAT_IS_AI_MEMORY]: ['/features', '/security-and-privacy', '/use-cases'],
  [LearnTopic.WHAT_ARE_CONTEXT_PACKS]: ['/features', '/use-cases', '/coding-agent'],
  [LearnTopic.WHAT_IS_LOCAL_AI]: ['/local-first-ai', '/architecture', '/security-and-privacy'],
  [LearnTopic.WHAT_ARE_OPEN_WEIGHT_MODELS]: ['/local-first-ai', '/supported-models', '/features'],
  [LearnTopic.WHAT_IS_SELF_HOSTED_AI]: ['/local-first-ai', '/architecture', '/contact'],
  [LearnTopic.OLLAMA_VS_LLAMACPP]: ['/local-first-ai', '/architecture', '/supported-models'],
  [LearnTopic.CLOUD_AI_VS_LOCAL_AI]: ['/local-first-ai', '/security-and-privacy', '/pricing'],
  [LearnTopic.AI_AGENT_VS_AI_CHATBOT]: ['/coding-agent', '/features', '/use-cases'],
};

/** Type guard for the dynamic route segment. */
export function isLearnTopic(value: string): value is LearnTopic {
  return (Object.values(LearnTopic) as string[]).includes(value);
}
