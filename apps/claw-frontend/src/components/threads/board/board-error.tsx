'use client';

import { AlertTriangle } from 'lucide-react';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { BoardErrorProps } from '@/types/thread-board-view.types';

export function BoardError({ onRetry, rateLimit = null }: BoardErrorProps): ReactElement {
  const { t } = useTranslation();
  if (rateLimit !== null) {
    const seconds = rateLimit.retryAfterSeconds;
    return (
      <div role="alert" data-testid="board-rate-limited">
        <EmptyState
          icon={AlertTriangle}
          title={t('chat.threadBoardRateLimitTitle')}
          description={
            seconds !== null && seconds > 0
              ? t('chat.threadBoardRateLimitWait', { seconds })
              : t('chat.threadBoardRateLimitBody')
          }
          action={
            <Button type="button" className="min-h-11" onClick={onRetry}>
              {t('chat.threadBoardRetry')}
            </Button>
          }
        />
      </div>
    );
  }
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
