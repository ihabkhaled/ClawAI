import {
  VIDEO_ABOUT_THIS_APP_PATTERN,
  VIDEO_GENERATION_PROMPT_MAX_CHARACTERS,
  VIDEO_PLANNED_PROMPT_SCHEMA,
  VIDEO_PLANNER_EVIDENCE_ITEMS,
  VIDEO_PLANNER_EVIDENCE_SNIPPET_CHARS,
  VIDEO_PLANNER_HISTORY_CHARS,
  VIDEO_PLANNER_HISTORY_MESSAGES,
  VIDEO_PLANNER_SYSTEM_PROMPT,
} from '../constants/video-generation.constants';
import type { AssembledContext } from '../types/context.types';
import { buildPlatformIdentityBlock } from './platform-identity.utility';

/** The rewritten prompt from a planner reply, or null when the reply is unusable. */
export function parsePlannedVideoPrompt(raw: string): string | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return null;
  }
  try {
    const parsed = VIDEO_PLANNED_PROMPT_SCHEMA.safeParse(JSON.parse(raw.slice(start, end + 1)));
    return parsed.success ? parsed.data.prompt : null;
  } catch {
    return null;
  }
}

/** The user's own words, cut to what image-service accepts. */
export function boundVideoPrompt(prompt: string): string {
  return prompt.trim().slice(0, VIDEO_GENERATION_PROMPT_MAX_CHARACTERS);
}

function recentConversation(context: AssembledContext, userText: string): string {
  return context.threadMessages
    .filter((message) => message.content.trim().length > 0 && message.content !== userText)
    .slice(-VIDEO_PLANNER_HISTORY_MESSAGES)
    .map(
      (message) =>
        `${message.role === 'USER' ? 'User' : 'Assistant'}: ${message.content
          .trim()
          .slice(0, VIDEO_PLANNER_HISTORY_CHARS)}`,
    )
    .join('\n');
}

function pageFacts(context: AssembledContext): string {
  return context.researchEvidence
    .slice(0, VIDEO_PLANNER_EVIDENCE_ITEMS)
    .map(
      (item) =>
        `- ${item.title ?? item.url}: ${item.snippet.slice(0, VIDEO_PLANNER_EVIDENCE_SNIPPET_CHARS)}`,
    )
    .join('\n');
}

/**
 * The single question put to the planner model: the request, the last few turns,
 * any page facts research produced, and (only when the request is about the app the
 * user is in) the platform background, so "a video about ClawAI" is about ClawAI.
 */
export function buildVideoPlannerPrompt(userText: string, context: AssembledContext): string {
  const sections = [VIDEO_PLANNER_SYSTEM_PROMPT];
  if (VIDEO_ABOUT_THIS_APP_PATTERN.test(userText)) {
    sections.push(`Background:\n${buildPlatformIdentityBlock(context.platformOrigin)}`);
  }
  const facts = pageFacts(context);
  if (facts.length > 0) {
    sections.push(`Facts from pages that were read:\n${facts}`);
  }
  const history = recentConversation(context, userText);
  if (history.length > 0) {
    sections.push(`Recent conversation:\n${history}`);
  }
  sections.push(
    `Video request:\n${userText.trim().slice(0, VIDEO_GENERATION_PROMPT_MAX_CHARACTERS)}`,
  );
  return sections.join('\n\n');
}
