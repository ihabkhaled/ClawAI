'use client';

import { AlertTriangle } from 'lucide-react';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { BoardErrorProps } from '@/types/thread-board-view.types';

export function BoardError({ onRetry }: BoardErrorProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div role="alert">
      <EmptyState
        icon={AlertTriangle}
        title={t('chat.threadBoardErrorTitle')}
        description={t('chat.threadBoardErrorBody')}
        action={
          <Button type="button" className="min-h-11" onClick={onRetry}>
            {t('chat.threadBoardRetry')}
          </Button>
        }
      />
    </div>
  );
}
