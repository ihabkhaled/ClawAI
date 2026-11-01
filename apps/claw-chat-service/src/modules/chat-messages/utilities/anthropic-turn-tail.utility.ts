// The part of a prompt that changes every turn of one agent run (a tool result),
// placed LAST in the conversation as its own text block.
//
// A prompt cache reads the longest prefix that is byte-identical to an earlier
// request. Anything that differs between two turns and sits in front of the
// conversation (in `system`, say) makes every byte after it a miss, however
// large and stable the messages are. At the end, only the tail is new.

import type { OpenAiChatMessage, OpenAiContentPart } from '../types/execution.types';

function asTextParts(content: OpenAiChatMessage['content']): OpenAiContentPart[] {
  return typeof content === 'string' ? [{ type: 'text', text: content }] : [...content];
}

/**
 * The conversation with `tail` as a final text block on the last user turn, or
 * as a user turn of its own when the conversation does not end on one. Pure.
 */
export function appendTailToConversation(
  conversation: OpenAiChatMessage[],
  tail: string,
): OpenAiChatMessage[] {
  if (tail.length === 0) {
    return conversation;
  }
  const tailPart: OpenAiContentPart = { type: 'text', text: tail };
  const last = conversation.at(-1);
  if (last?.role.toLowerCase() !== 'user') {
    return [...conversation, { role: 'user', content: [tailPart] }];
  }
  return [
    ...conversation.slice(0, -1),
    { ...last, content: [...asTextParts(last.content), tailPart] },
  ];
}
