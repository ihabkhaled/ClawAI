'use client';

import { ThreadPublicPageView } from '@/components/threads/thread-publication-page-view';
import { useThreadPublicPage } from '@/hooks/threads/use-thread-public-page';
import type { PublicThreadPublication } from '@/types/thread-publication.types';

export function ThreadPublicPageClient({
  initialPublication,
}: {
  initialPublication: PublicThreadPublication;
}): React.ReactElement {
  const state = useThreadPublicPage(initialPublication);
  return <ThreadPublicPageView state={state} />;
}
