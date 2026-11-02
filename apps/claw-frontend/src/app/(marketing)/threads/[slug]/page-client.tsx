'use client';

import { ThreadPublicPageView } from '@/components/threads/thread-publication-page-view';
import { useThreadPublicPage } from '@/hooks/threads/use-thread-public-page';
import type { PublicThreadPublication } from '@/types/thread-publication.types';

export function ThreadPublicPageClient({
  initialPublication,
  lang = null,
}: {
  initialPublication: PublicThreadPublication;
  /** The language of the text being read (`?lang`), null for the language it was written in. */
  lang?: string | null;
}): React.ReactElement {
  const state = useThreadPublicPage(initialPublication, lang);
  return <ThreadPublicPageView state={state} />;
}
