/**
 * The assistants ClawAI publishes a comparison against.
 *
 * The value is the URL segment (`/compare/chatgpt`), so renaming one is a
 * redirect decision, not a refactor.
 */
export enum ComparisonRival {
  CHATGPT = 'chatgpt',
  CLAUDE = 'claude',
  GEMINI = 'gemini',
  PERPLEXITY = 'perplexity',
  COPILOT = 'copilot',

  // The open-weight challengers. Added because the question people actually ask
  // about these is different from the one they ask about ChatGPT: not "which is
  // the better assistant" but "can I run this myself, and what does it cost".
  KIMI = 'kimi',
  QWEN = 'qwen',
  GLM = 'glm',
  DEEPSEEK = 'deepseek',
}
