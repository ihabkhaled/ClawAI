'use client';

import { ThreadPublicPageView } from '@/components/threads/thread-publication-page-view';
import { useThreadPublicPage } from '@/hooks/threads/use-thread-public-page';

export function ThreadPublicPageClient(): React.ReactElement {
  const state = useThreadPublicPage();
  return <ThreadPublicPageView state={state} />;
}
