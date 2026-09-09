/**
 * The topic pages under `/prompts`.
 *
 * Unlike every other cluster built under ADR-084, this one is not primarily
 * about ClawAI's own capabilities — it is genuine prompt-writing education:
 * the same techniques apply whichever model or product someone uses. See
 * `docs/05-frontend/seo-content-architecture.md` §4/§8.2 for the intent
 * classification (informational, like `/learn`) and the ad-eligibility call.
 */
export enum PromptGuideTopic {
  WRITING_CLEAR_PROMPTS = 'writing-clear-prompts',
  FEW_SHOT_PROMPTING = 'few-shot-prompting',
  CHAIN_OF_THOUGHT_PROMPTING = 'chain-of-thought-prompting',
  PROMPTING_FOR_STRUCTURED_OUTPUT = 'prompting-for-structured-output',
  SYSTEM_PROMPTS_VS_USER_PROMPTS = 'system-prompts-vs-user-prompts',
  ITERATING_ON_A_PROMPT = 'iterating-on-a-prompt',
  PROMPTING_BY_TASK_TYPE = 'prompting-by-task-type',
}
