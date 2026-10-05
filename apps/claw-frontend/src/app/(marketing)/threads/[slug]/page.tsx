import type { Metadata } from 'next';

import { ThreadPublicPageClient } from './page-client';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PublicThreadPublicationPage(): React.ReactElement {
  return <ThreadPublicPageClient />;
}
