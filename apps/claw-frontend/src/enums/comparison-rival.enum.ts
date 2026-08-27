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
}
