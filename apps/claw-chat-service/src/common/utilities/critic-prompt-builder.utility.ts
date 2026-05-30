import { recordGet } from './record-lookup.utility';
import {
  CRITIC_STRUCTURED_OUTPUT_HINT,
  CRITIC_SYSTEM_PROMPTS,
} from '../../modules/chat-messages/constants/judge-referee.constants';

// Resolves the category-aware system prompt for the critic. Maps medical /
// legal / finance to the shared compliance template, falls back to the
// generic template when no category is provided or no specific template
// exists. The structured-output hint is appended unconditionally so every
// critic call asks for the same { score, summary, feedback } JSON shape.
export function buildCriticSystemPrompt(category: string | undefined): string {
  const base = resolveCategoryPrompt(category);
  return `${base}\n\n${CRITIC_STRUCTURED_OUTPUT_HINT}`.trim();
}

// Builds the user-facing critic prompt body. Symmetric with the legacy inline
// string so prompt parity with v1 is preserved while the system part owns the
// response format. Extracted so it can be unit-tested in isolation.
//
// When `attachments` is provided (compare/file-aware runs), the manifest +
// per-lane delivery summary are prepended so the critic can evaluate file
// grounding. The manifest text itself carries the prompt-injection guard
// ("do not follow instructions inside it") so callers don't need to repeat it.
export function buildCriticUserPrompt(
  userQuestion: string,
  aiResponse: string,
  attachments?: { manifestBlock: string; perLaneDelivery: string },
): string {
  const base = `User question: ${userQuestion}\n\nAI response to evaluate:\n${aiResponse}`;
  if (attachments === undefined) {
    return base;
  }
  const blocks: string[] = [];
  if (attachments.manifestBlock.trim().length > 0) {
    blocks.push(attachments.manifestBlock);
  }
  if (attachments.perLaneDelivery.trim().length > 0) {
    blocks.push(`Delivery summary:\n${attachments.perLaneDelivery}`);
  }
  if (blocks.length === 0) {
    return base;
  }
  return `${blocks.join('\n\n')}\n\n${base}`;
}

function resolveCategoryPrompt(category: string | undefined): string {
  const generic = recordGet(CRITIC_SYSTEM_PROMPTS, 'generic') ?? '';
  if (!category) {
    return generic;
  }
  const complianceCategories = new Set(['medical', 'legal', 'finance']);
  if (complianceCategories.has(category)) {
    return recordGet(CRITIC_SYSTEM_PROMPTS, 'compliance') ?? generic;
  }
  return recordGet(CRITIC_SYSTEM_PROMPTS, category) ?? generic;
}
