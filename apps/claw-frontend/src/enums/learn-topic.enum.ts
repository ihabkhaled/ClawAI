/**
 * The concept pages under `/learn`.
 *
 * Each member is a URL segment and a distinct search intent. Two rules decided
 * this list, and both removed candidates:
 *
 * 1. **One intent, one page.** "What is an AI router" and "what is AI model
 *    routing" are the same question; only `WHAT_IS_AI_MODEL_ROUTING` exists.
 * 2. **Never compete with an existing page.** "What is local-first AI" was
 *    dropped because `/local-first-ai` already owns it — `/learn` links there
 *    instead of ranking against it.
 *
 * `/learn` defines a concept; `/features/*` documents ClawAI's implementation of
 * it. Every topic that has a feature counterpart links to it, and neither page
 * does the other's job.
 */
export enum LearnTopic {
  WHAT_IS_LLM_ORCHESTRATION = 'what-is-llm-orchestration',
  WHAT_IS_AI_MODEL_ROUTING = 'what-is-ai-model-routing',
  WHAT_IS_MULTI_MODEL_AI = 'what-is-multi-model-ai',
  WHAT_IS_AI_CONSENSUS = 'what-is-ai-consensus',
  WHAT_IS_BEST_OF_N = 'what-is-best-of-n',
  WHAT_IS_AN_AI_JUDGE = 'what-is-an-ai-judge',
  WHAT_IS_AI_ANSWER_VERIFICATION = 'what-is-ai-answer-verification',
  WHAT_IS_MODEL_FALLBACK = 'what-is-model-fallback',
  WHAT_IS_RAG = 'what-is-rag',
  WHAT_IS_AI_MEMORY = 'what-is-ai-memory',
  WHAT_IS_A_CONTEXT_WINDOW = 'what-is-a-context-window',
  WHAT_ARE_CONTEXT_PACKS = 'what-are-context-packs',
  WHAT_IS_LOCAL_AI = 'what-is-local-ai',
  WHAT_IS_SELF_HOSTED_AI = 'what-is-self-hosted-ai',
  WHAT_ARE_OPEN_WEIGHT_MODELS = 'what-are-open-weight-models',
  CLOUD_AI_VS_LOCAL_AI = 'cloud-ai-vs-local-ai',
  OLLAMA_VS_LLAMACPP = 'ollama-vs-llamacpp',
  AI_AGENT_VS_AI_CHATBOT = 'ai-agent-vs-ai-chatbot',
}
