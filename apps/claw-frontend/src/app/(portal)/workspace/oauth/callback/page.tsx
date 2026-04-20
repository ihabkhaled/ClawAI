'use client';

import { Suspense } from 'react';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { OAuthCallbackView } from '@/components/workspace-providers/oauth-callback-view';

export default function WorkspaceOAuthCallbackPage(): React.ReactElement {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading..." />}>
      <OAuthCallbackView />
    </Suspense>
  );
}
