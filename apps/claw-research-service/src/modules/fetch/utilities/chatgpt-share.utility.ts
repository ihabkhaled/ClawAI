import {
  CHATGPT_SHARE_HOSTS,
  CHATGPT_SHARE_PATH_RE,
  CHATGPT_SHARE_ROLE_LABELS,
  CHATGPT_SHARE_TEXT_CONTENT_TYPES,
  PROSE_MAX_NODES,
} from '../constants/embedded-content.constants';
import { collectEmbeddedState } from './embedded-state.utility';
import { asRecord, asText, findObject } from './script-blocks.utility';
import type { ConversationTurn, SiteAdapterText } from '../types/embedded-content.types';

/** A public ChatGPT share link (`chatgpt.com/share/<id>`). */
export function isChatGptShareUrl(url: URL): boolean {
  return (
    CHATGPT_SHARE_HOSTS.has(url.hostname.toLowerCase()) && CHATGPT_SHARE_PATH_RE.test(url.pathname)
  );
}

/**
 * Reads a shared ChatGPT conversation from the data the share page itself
 * ships: the user and assistant turns in order, hidden system/tool messages
 * left out. Three shapes are seen (2026-11-22): a React Router stream with
 * `linear_conversation` (desktop document), `__WEB_MOBILE_DATA__` with
 * `conversation.messages[{role, content}]` (the "octane" frontend a browser
 * may get), and the older `__NEXT_DATA__` `mapping`/`current_node`. Null when
 * the page carries no conversation (the bot link-preview variant, a deleted
 * share), so the caller falls back to ordinary extraction.
 */
export function extractChatGptShare(html: string): SiteAdapterText | null {
  const roots = collectEmbeddedState(html).map((entry) => entry.value);
  const conversation = findObject(
    roots,
    (value) =>
      Array.isArray(value['linear_conversation']) ||
      isMappingConversation(value) ||
      isFlatConversation(value),
    PROSE_MAX_NODES,
  );
  if (conversation === null) {
    return null;
  }
  const turns = messageNodesOf(conversation).flatMap((node) => turnOf(node));
  if (turns.length === 0) {
    return null;
  }
  const title = asText(conversation['title']);
  const body = turns.map((turn) => `**${turn.role}:**\n${turn.text}`).join('\n\n');
  return { title, text: title === null ? body : `# ${title}\n\n${body}` };
}

function isMappingConversation(value: Record<string, unknown>): boolean {
  return asRecord(value['mapping']) !== null && typeof value['current_node'] === 'string';
}

function isFlatConversation(value: Record<string, unknown>): boolean {
  const messages = value['messages'];
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.every((message) => {
      const record = asRecord(message);
      return typeof record?.['role'] === 'string' && typeof record['content'] === 'string';
    })
  );
}

/** The conversation's nodes in order: `linear_conversation`, flat `messages`, else the `mapping` path. */
function messageNodesOf(conversation: Record<string, unknown>): unknown[] {
  const linear = conversation['linear_conversation'];
  if (Array.isArray(linear)) {
    return linear;
  }
  const flat = conversation['messages'];
  if (Array.isArray(flat)) {
    return flat.map((message) => ({ message: flatToMessage(message) }));
  }
  const mapping = new Map(Object.entries(asRecord(conversation['mapping']) ?? {}));
  const path: unknown[] = [];
  let id = asText(conversation['current_node']);
  while (id !== null && path.length < mapping.size) {
    const node = asRecord(mapping.get(id));
    if (node === null) {
      break;
    }
    path.push(node);
    id = asText(node['parent']);
  }
  return path.reverse();
}

function turnOf(node: unknown): ConversationTurn[] {
  const message = asRecord(asRecord(node)?.['message']);
  const role = asText(asRecord(message?.['author'])?.['role']);
  const label = role === null ? undefined : CHATGPT_SHARE_ROLE_LABELS.get(role);
  if (message === null || label === undefined || isHidden(message)) {
    return [];
  }
  const content = asRecord(message['content']);
  const contentType = asText(content?.['content_type']);
  const parts = content?.['parts'];
  if (
    contentType === null ||
    !CHATGPT_SHARE_TEXT_CONTENT_TYPES.has(contentType) ||
    !Array.isArray(parts)
  ) {
    return [];
  }
  const text = parts
    .map((part) => asText(part))
    .filter((part): part is string => part !== null)
    .join('\n');
  return text.length === 0 ? [] : [{ role: label, text }];
}

/** `{role, content: "text"}` in the node shape `turnOf` reads. */
function flatToMessage(message: unknown): Record<string, unknown> {
  const record = asRecord(message);
  return {
    author: { role: record?.['role'] },
    content: { content_type: 'text', parts: [record?.['content']] },
  };
}

function isHidden(message: Record<string, unknown>): boolean {
  return asRecord(message['metadata'])?.['is_visually_hidden_from_conversation'] === true;
}
