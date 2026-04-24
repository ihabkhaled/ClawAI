'use client';

import { Suspense } from 'react';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { OAuthCallbackView } from '@/components/workspace-providers/oauth-callback-view';
import { useTranslation } from '@/lib/i18n';

export default function WorkspaceOAuthCallbackPage(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<LoadingSpinner label={t('common.loading')} />}>
      <OAuthCallbackView />
    </Suspense>
  );
}
