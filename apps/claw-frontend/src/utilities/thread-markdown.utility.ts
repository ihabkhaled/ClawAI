import { MessageRole } from '@/enums';
import type { ChatMessage, ThreadMarkdownInput } from '@/types';

/**
 * The label a role gets in the exported file.
 *
 * Deliberately not translated: an exported transcript is a document that leaves
 * the product and gets pasted into an issue tracker, a review, or a mail. Stable
 * English labels keep two exports from two people comparable.
 */
const ROLE_LABEL: Record<MessageRole, string> = {
  [MessageRole.USER]: 'User',
  [MessageRole.ASSISTANT]: 'Assistant',
  [MessageRole.SYSTEM]: 'System',
  [MessageRole.TOOL]: 'Tool',
};

function formatAttribution(message: ChatMessage): string {
  const parts = [message.provider, message.model].filter(
    (part): part is string => typeof part === 'string' && part.length > 0,
  );
  return parts.length > 0 ? ` — ${parts.join(' / ')}` : '';
}

function formatMessage(message: ChatMessage): string {
  const label = ROLE_LABEL[message.role];
  const timestamp = message.createdAt ? ` (${message.createdAt})` : '';
  return `## ${label}${formatAttribution(message)}${timestamp}\n\n${message.content}\n`;
}

/**
 * Renders a conversation as Markdown.
 *
 * Includes which model answered each turn, because that is the fact the export
 * exists to carry: a transcript that does not say who said what is a wall of
 * text, and in a product where a single thread can move between nine model
 * families it is actively misleading.
 *
 * Attachments are named rather than embedded — a Markdown file cannot carry
 * them, and a link to an authenticated URL would be dead for whoever receives
 * the file.
 */
export function buildThreadMarkdown(input: ThreadMarkdownInput): string {
  const header = [
    `# ${input.title}`,
    '',
    `Exported from ClawAI on ${input.exportedAt}`,
    `${input.messages.length} messages`,
    '',
    '---',
    '',
  ];

  return `${header.join('\n')}${input.messages.map(formatMessage).join('\n---\n\n')}`;
}

/**
 * A filesystem-safe name derived from the thread title.
 *
 * Falls back to the thread id rather than to a generic name: two exports called
 * `conversation.md` in one downloads folder is the failure this avoids.
 */
export function buildThreadExportFilename(title: string, threadId: string): string {
  const slug = title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 60);

  return `clawai-${slug.length > 0 ? slug : threadId}.md`;
}
