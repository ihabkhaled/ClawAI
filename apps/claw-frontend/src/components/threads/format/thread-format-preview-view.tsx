import type { ReactElement } from 'react';

import { ThreadArticleBody } from '@/components/threads/article/thread-article-body';
import { useThreadReaderBody } from '@/hooks/threads/use-thread-reader-body';
import type { ThreadFormatPreviewViewProps } from '@/types/thread-format.types';
import { threadContentDirection } from '@/utilities/thread-content-direction.utility';

/** The article drawn the way readers will see it, inside a box that scrolls on its own. */
export function ThreadFormatPreviewView({
  markdown,
  contentLocale,
}: ThreadFormatPreviewViewProps): ReactElement {
  const { labels, toc, readingTimeLabel } = useThreadReaderBody(markdown, undefined, contentLocale);
  return (
    <div
      className="border-border bg-card max-h-[36rem] overflow-y-auto rounded-lg border p-4 sm:p-6"
      lang={contentLocale}
      dir={threadContentDirection(contentLocale)}
      data-testid="thread-format-preview"
    >
      <ThreadArticleBody
        markdown={markdown}
        labels={labels}
        toc={toc}
        readingTimeLabel={readingTimeLabel}
        truncatedLabel=""
      />
    </div>
  );
}
