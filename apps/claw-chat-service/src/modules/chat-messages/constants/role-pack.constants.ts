import type { RoleMember } from '../types/role-pack.types';

export const ROLE_PACK_TIMEOUT_MS = 120_000;
export const DEFAULT_ROLE_PACK_MODEL = 'gemma3:4b';

export const ROLE_PACKS: Record<string, RoleMember[]> = {
  'coding-team': [
    {
      role: 'Coder',
      instruction: 'Write clean, efficient code to implement:',
      model: 'gemma3:4b',
    },
    {
      role: 'Debugger',
      instruction: 'Analyze for bugs, edge cases, and security issues:',
      model: 'gemma3:4b',
    },
    {
      role: 'Reviewer',
      instruction: 'Review code quality, readability, and best practices for:',
      model: 'gemma3:4b',
    },
  ],
  'research-team': [
    {
      role: 'Researcher',
      instruction: 'Research and compile factual information about:',
      model: 'gemma3:4b',
    },
    {
      role: 'Analyst',
      instruction: 'Analyze and identify patterns, trends, and insights for:',
      model: 'gemma3:4b',
    },
    {
      role: 'Synthesizer',
      instruction: 'Synthesize findings into clear conclusions for:',
      model: 'gemma3:4b',
    },
  ],
  'marketing-team': [
    {
      role: 'Strategist',
      instruction: 'Define the marketing strategy and value proposition for:',
      model: 'gemma3:4b',
    },
    {
      role: 'Copywriter',
      instruction: 'Write compelling, persuasive copy for:',
      model: 'gemma3:4b',
    },
    {
      role: 'Editor',
      instruction: 'Refine, polish, and improve the messaging for:',
      model: 'gemma3:4b',
    },
  ],
  'legal-team': [
    {
      role: 'Researcher',
      instruction: 'Research relevant legal principles and precedents for:',
      model: 'gemma3:4b',
    },
    {
      role: 'Analyst',
      instruction: 'Identify legal risks, obligations, and considerations for:',
      model: 'gemma3:4b',
    },
    {
      role: 'Advisor',
      instruction: 'Provide practical legal guidance and recommendations for:',
      model: 'gemma3:4b',
    },
  ],
};
