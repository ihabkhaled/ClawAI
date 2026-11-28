import {
  RESEARCH_CONVERSATION_ASSISTANT_MAX_CHARS,
  RESEARCH_CONVERSATION_MAX_CHARS,
  RESEARCH_CONVERSATION_MAX_MESSAGES,
  RESEARCH_CONVERSATION_MEMORY_LABEL,
  RESEARCH_CONVERSATION_MEMORY_MAX_CHARS,
  RESEARCH_CONVERSATION_USER_MAX_CHARS,
} from '../../../common/constants/research-gate.constants';
import type { ResearchConversationMessage } from '../types/research-orchestration.types';

/** One earlier turn as one bounded line; an answer's [n] marks are noise to a planner. */
function toLine(message: ResearchConversationMessage): string | null {
  const isUser = message.role === 'USER';
  if (!isUser && message.role !== 'ASSISTANT') {
    return null;
  }
  const limit = isUser
    ? RESEARCH_CONVERSATION_USER_MAX_CHARS
    : RESEARCH_CONVERSATION_ASSISTANT_MAX_CHARS;
  const text = message.content
    .replaceAll(/\[\d{1,3}\]/gu, '')
    .replaceAll(/\s+/gu, ' ')
    .trim()
    .slice(0, limit);
  return text.length === 0 ? null : `${isUser ? 'User' : 'Assistant'}: ${text}`;
}

/** The newest lines that fit, plus the chat's first message when it did not (it sets the topic). Oldest first. */
function recentLines(lines: readonly string[]): string[] {
  const kept: string[] = [];
  let length = 0;
  for (const line of lines) {
    if (
      kept.length >= RESEARCH_CONVERSATION_MAX_MESSAGES ||
      length + line.length > RESEARCH_CONVERSATION_MAX_CHARS
    ) {
      break;
    }
    kept.push(line);
    length += line.length;
  }
  const first = lines.at(-1);
  if (first !== undefined && kept.length < lines.length) {
    kept.push(first);
  }
  return kept.reverse();
}

/** The user's saved memories as lines, within their own budget. */
function memoryLines(memories: readonly string[]): string[] {
  const kept: string[] = [];
  let length = 0;
  for (const memory of memories) {
    const line = `- ${memory.replaceAll(/\s+/gu, ' ').trim()}`;
    if (length + line.length > RESEARCH_CONVERSATION_MEMORY_MAX_CHARS) {
      break;
    }
    kept.push(line);
    length += line.length;
  }
  return kept;
}

/**
 * What a research plan may read besides the current message: the whole recent chat, oldest first, and the user's
 * saved memories, so "search again", "the lyrics above" or "news about my company" resolve to what they point at.
 * `newestFirst` includes the current message, which is skipped (it is the message itself). Without this the planner
 * searched for the words of the request (owner report 2026-11-28: it searched "above-mentioned").
 */
export function buildResearchConversation(
  newestFirst: readonly ResearchConversationMessage[],
  currentMessage: string,
  memories: readonly string[] = [],
): string {
  const current = currentMessage.trim();
  const skipAt = newestFirst.findIndex(
    (message) => message.role === 'USER' && message.content.trim() === current,
  );
  const lines = newestFirst
    .filter((_, position) => position !== skipAt)
    .map((message) => toLine(message))
    .filter((line): line is string => line !== null);
  const saved = memoryLines(memories);
  const memoryBlock = saved.length > 0 ? [RESEARCH_CONVERSATION_MEMORY_LABEL, ...saved] : [];
  return [...memoryBlock, ...recentLines(lines)].join('\n');
}
