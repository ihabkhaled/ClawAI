import type { RoleMember } from '../types/role-pack.types';

export const ROLE_PACK_TIMEOUT_MS = 120_000;
export const DEFAULT_ROLE_PACK_MODEL = 'AUTO';

export const ROLE_PACKS: Record<string, RoleMember[]> = {
  'coding-team': [
    {
      role: 'Coder',
      instruction: 'Write clean, efficient code to implement:',
      model: 'AUTO',
    },
    {
      role: 'Debugger',
      instruction: 'Analyze for bugs, edge cases, and security issues:',
      model: 'AUTO',
    },
    {
      role: 'Reviewer',
      instruction: 'Review code quality, readability, and best practices for:',
      model: 'AUTO',
    },
  ],
  'research-team': [
    {
      role: 'Researcher',
      instruction: 'Research and compile factual information about:',
      model: 'AUTO',
    },
    {
      role: 'Analyst',
      instruction: 'Analyze and identify patterns, trends, and insights for:',
      model: 'AUTO',
    },
    {
      role: 'Synthesizer',
      instruction: 'Synthesize findings into clear conclusions for:',
      model: 'AUTO',
    },
  ],
  'marketing-team': [
    {
      role: 'Strategist',
      instruction: 'Define the marketing strategy and value proposition for:',
      model: 'AUTO',
    },
    {
      role: 'Copywriter',
      instruction: 'Write compelling, persuasive copy for:',
      model: 'AUTO',
    },
    {
      role: 'Editor',
      instruction: 'Refine, polish, and improve the messaging for:',
      model: 'AUTO',
    },
  ],
  'legal-team': [
    {
      role: 'Researcher',
      instruction: 'Research relevant legal principles and precedents for:',
      model: 'AUTO',
    },
    {
      role: 'Analyst',
      instruction: 'Identify legal risks, obligations, and considerations for:',
      model: 'AUTO',
    },
    {
      role: 'Advisor',
      instruction: 'Provide practical legal guidance and recommendations for:',
      model: 'AUTO',
    },
  ],
};
