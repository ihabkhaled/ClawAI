import { useMemo } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { ThreadArticleLabels, ThreadTocItem } from '@/types/thread-article.types';
import { estimateReadingMinutes, extractThreadToc } from '@/utilities/thread-article-toc.utility';

/** Labels, table of contents and reading time of one Thread article, in the reader's language. */
export function useThreadReaderBody(
  markdown: string,
  title: string | undefined,
  contentLocale: string,
): { labels: ThreadArticleLabels; toc: ThreadTocItem[]; readingTimeLabel: string } {
  const { t } = useTranslation();
  const toc = useMemo(() => extractThreadToc(markdown, title), [markdown, title]);
  const minutes = useMemo(
    () => estimateReadingMinutes(markdown, contentLocale),
    [markdown, contentLocale],
  );
  return {
    toc,
    readingTimeLabel: t('threadArticle.readingTime', { minutes }),
    labels: {
      toc: t('threadArticle.toc'),
      copyLink: t('threadArticle.copyLink'),
      linkCopied: t('threadArticle.linkCopied'),
      note: t('threadArticle.note'),
      tip: t('threadArticle.tip'),
      warning: t('threadArticle.warning'),
    },
  };
}
