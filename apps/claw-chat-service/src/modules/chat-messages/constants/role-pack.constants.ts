import type { RoleMember } from '../types/role-pack.types';

export const ROLE_PACK_TIMEOUT_MS = 120_000;
export const DEFAULT_ROLE_PACK_MODEL = 'qwen3:1.7b';

export const ROLE_PACKS: Record<string, RoleMember[]> = {
  'coding-team': [
    {
      role: 'Coder',
      instruction: 'Write clean, efficient code to implement:',
      model: 'qwen3:1.7b',
    },
    {
      role: 'Debugger',
      instruction: 'Analyze for bugs, edge cases, and security issues:',
      model: 'qwen3:1.7b',
    },
    {
      role: 'Reviewer',
      instruction: 'Review code quality, readability, and best practices for:',
      model: 'qwen3:1.7b',
    },
  ],
  'research-team': [
    {
      role: 'Researcher',
      instruction: 'Research and compile factual information about:',
      model: 'qwen3:1.7b',
    },
    {
      role: 'Analyst',
      instruction: 'Analyze and identify patterns, trends, and insights for:',
      model: 'qwen3:1.7b',
    },
    {
      role: 'Synthesizer',
      instruction: 'Synthesize findings into clear conclusions for:',
      model: 'qwen3:1.7b',
    },
  ],
  'marketing-team': [
    {
      role: 'Strategist',
      instruction: 'Define the marketing strategy and value proposition for:',
      model: 'qwen3:1.7b',
    },
    {
      role: 'Copywriter',
      instruction: 'Write compelling, persuasive copy for:',
      model: 'qwen3:1.7b',
    },
    {
      role: 'Editor',
      instruction: 'Refine, polish, and improve the messaging for:',
      model: 'qwen3:1.7b',
    },
  ],
  'legal-team': [
    {
      role: 'Researcher',
      instruction: 'Research relevant legal principles and precedents for:',
      model: 'qwen3:1.7b',
    },
    {
      role: 'Analyst',
      instruction: 'Identify legal risks, obligations, and considerations for:',
      model: 'qwen3:1.7b',
    },
    {
      role: 'Advisor',
      instruction: 'Provide practical legal guidance and recommendations for:',
      model: 'qwen3:1.7b',
    },
  ],
};
