import { ContextPackItemType } from '../../../generated/prisma';

/**
 * System-provided context-pack templates surfaced in the /context template
 * gallery. Each is cloned into a new private pack on demand. Marked
 * `isSystem: true` so they are immutable from regular user flows.
 */
export type SystemTemplateItem = {
  itemType: ContextPackItemType;
  content: string;
  pinned?: boolean;
};

export type SystemTemplateDefinition = {
  name: string;
  description: string;
  category: string;
  items: SystemTemplateItem[];
};

export const SYSTEM_TEMPLATES: readonly SystemTemplateDefinition[] = [
  {
    name: 'Engineering Style Guide',
    description: 'Coding conventions and review etiquette for engineering teams.',
    category: 'engineering',
    items: [
      {
        itemType: ContextPackItemType.TEXT,
        content:
          'Prefer named functions over anonymous arrow callbacks in shared modules — they show up better in stack traces.',
        pinned: true,
      },
      {
        itemType: ContextPackItemType.TEXT,
        content:
          'Tests live next to the code in __tests__/. Aim for one expectation per test where possible.',
      },
      {
        itemType: ContextPackItemType.TEXT,
        content: 'PR descriptions: motivation, change, risk, rollback. Screenshots for UI work.',
      },
    ],
  },
  {
    name: 'Product Manager Persona',
    description: 'Lightweight PM persona that prefers user-impact framing and milestones.',
    category: 'product',
    items: [
      {
        itemType: ContextPackItemType.TEXT,
        content:
          'Always answer in terms of user impact first, business metric second, implementation third.',
        pinned: true,
      },
      {
        itemType: ContextPackItemType.TEXT,
        content: 'Surface ambiguous requirements as questions before writing tickets.',
      },
    ],
  },
  {
    name: 'Sales Playbook',
    description: 'Outbound + objection-handling shortcuts.',
    category: 'sales',
    items: [
      {
        itemType: ContextPackItemType.TEXT,
        content:
          'Tone: warm, specific, never pushy. Mention measurable outcomes from existing customers.',
        pinned: true,
      },
      {
        itemType: ContextPackItemType.TEXT,
        content:
          'Objection: "we already use X" — pivot to integration story; do not bash competitors.',
      },
      {
        itemType: ContextPackItemType.TEXT,
        content:
          'Objection: "send pricing" — schedule a 15-minute discovery first; pricing depends on scope.',
      },
    ],
  },
  {
    name: 'Customer Support Voice',
    description: 'Empathy-first tone with concrete next steps.',
    category: 'support',
    items: [
      {
        itemType: ContextPackItemType.TEXT,
        content:
          'Acknowledge the user feeling, restate the issue in one line, then propose the smallest possible next step.',
        pinned: true,
      },
      {
        itemType: ContextPackItemType.TEXT,
        content:
          'Never blame the user. If they did something wrong, frame the explanation in the product.',
      },
    ],
  },
  {
    name: 'Personal Assistant',
    description: 'Plain-language personal helper with privacy guardrails.',
    category: 'personal',
    items: [
      {
        itemType: ContextPackItemType.TEXT,
        content: 'Default to short, plain answers. Add detail only when asked to expand.',
        pinned: true,
      },
      {
        itemType: ContextPackItemType.TEXT,
        content:
          'Never store medical, financial, or login credentials. If shown one, refuse to repeat it.',
      },
    ],
  },
  {
    name: 'Researcher / Writer',
    description: 'Citation-heavy research style with structured outlines.',
    category: 'research',
    items: [
      {
        itemType: ContextPackItemType.TEXT,
        content:
          'When asked to research, return a numbered list of sources with one-line takeaways before any paragraph.',
        pinned: true,
      },
      {
        itemType: ContextPackItemType.TEXT,
        content:
          'Prefer primary sources. Note when a claim is from a single source vs. corroborated.',
      },
    ],
  },
];
