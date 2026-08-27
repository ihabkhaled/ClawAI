import { PublicSharedMessage } from '@/components/chat-shares/public-shared-message';
import { MessageRole } from '@/enums/message-role.enum';
import type { PublicSharedMessageListProps } from '@/types';

/**
 * The published conversation, in order.
 *
 * An `<ol>` rather than a stack of divs: the order of turns is meaning, not
 * layout, and a screen reader announcing "list, 12 items" tells a listener how
 * long the conversation is before they commit to it.
 *
 * Not virtualised. Virtualisation would keep most of the conversation out of the
 * server-rendered HTML, which defeats the point of the page — a crawler and a
 * screen reader must both receive the whole transcript. Length is bounded by the
 * server-side snapshot cap instead.
 *
 * The inline ad, when there is one, is rendered as its own list-level sibling
 * BETWEEN two messages — never inside a message article, never inside markdown,
 * never inside a code block. An advertisement that shares a bubble with an
 * assistant turn reads as model output, which is exactly the confusion the ad
 * policy forbids.
 */
export function PublicSharedMessageList({
  messages,
  publicShareId,
  imageLabel,
  userRoleLabel,
  assistantRoleLabel,
  truncatedLabel,
  inlineAd,
  inlineAdAfterIndex,
  formatTimestamp,
  formatModelLabel,
}: PublicSharedMessageListProps): React.ReactElement {
  return (
    <ol className="space-y-3 sm:space-y-4">
      {messages.map((message, index) => (
        <li key={message.id}>
          <PublicSharedMessage
            message={message}
            publicShareId={publicShareId}
            imageLabel={imageLabel}
            roleLabel={message.role === MessageRole.USER ? userRoleLabel : assistantRoleLabel}
            timestampLabel={formatTimestamp(message.createdAt)}
            modelLabel={formatModelLabel(message)}
            truncatedLabel={truncatedLabel}
          />
          {inlineAdAfterIndex === index + 1 ? <div className="mt-3">{inlineAd}</div> : null}
        </li>
      ))}
    </ol>
  );
}
