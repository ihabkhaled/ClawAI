import type { ReactElement } from 'react';

import { ThreadMentionTokenKind } from '@/enums/thread-mention-token-kind.enum';
import { tokenizeMentions } from '@/utilities/thread-mention.utility';

/** Comment text as plain text nodes with `@username` styled. Never markup, never a link. */
export function ThreadCommentBody({ content }: { content: string }): ReactElement {
  return (
    <p dir="auto" className="text-sm [overflow-wrap:anywhere] break-words whitespace-pre-wrap">
      {tokenizeMentions(content).map((token) =>
        token.kind === ThreadMentionTokenKind.Mention ? (
          <span
            key={token.start}
            data-testid="thread-mention"
            className="bg-primary/10 text-primary rounded px-1 font-medium [unicode-bidi:isolate]"
          >
            @{token.value}
          </span>
        ) : (
          <span key={token.start}>{token.value}</span>
        ),
      )}
    </p>
  );
}
