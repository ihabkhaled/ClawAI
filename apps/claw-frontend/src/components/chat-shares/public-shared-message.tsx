import { PublicMarkdownRenderer } from '@/components/chat-shares/public-markdown-renderer';
import { MessageRole } from '@/enums/message-role.enum';
import { cn } from '@/lib/utils';
import type { PublicSharedMessageProps } from '@/types';

/**
 * One published message.
 *
 * Rendered as an `<article>` inside the list's `<ol>` so the document outline a
 * screen reader or a crawler builds reflects the conversation: an ordered sequence
 * of labelled turns, not an undifferentiated wall of text.
 *
 * User and assistant turns are distinguished by border side, background tint, AND
 * the visible role label — never by colour alone (WCAG 1.4.1).
 *
 * There is no feedback control, no regenerate, no copy-to-thread, and no
 * continue-this-chat. This is a viewing surface; anything that mutates or imports
 * the conversation belongs to the signed-in product, not here.
 */
export function PublicSharedMessage({
  message,
  roleLabel,
  timestampLabel,
  modelLabel,
  truncatedLabel,
}: PublicSharedMessageProps): React.ReactElement {
  const isUser = message.role === MessageRole.USER;

  return (
    <article
      className={cn(
        'rounded-lg border p-3 sm:p-4',
        isUser ? 'border-s-primary bg-muted/40 border-s-4' : 'bg-card',
      )}
      aria-labelledby={`message-${message.id}-role`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3
          id={`message-${message.id}-role`}
          className="text-xs font-semibold tracking-wide uppercase"
        >
          {roleLabel}
        </h3>
        {modelLabel === null ? null : (
          <span className="text-muted-foreground text-xs">{modelLabel}</span>
        )}
        <time className="text-muted-foreground ms-auto text-xs" dateTime={message.createdAt}>
          {timestampLabel}
        </time>
      </div>
      {/* `break-words` and `min-w-0` together are what stop a 400-character
          unbroken token from widening the page instead of wrapping. */}
      <div className="prose-sm max-w-none min-w-0 text-sm leading-relaxed break-words">
        <PublicMarkdownRenderer content={message.content} truncatedLabel={truncatedLabel} />
      </div>
    </article>
  );
}
