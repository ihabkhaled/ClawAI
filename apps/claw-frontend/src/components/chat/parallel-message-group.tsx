'use client';

import { CompareResultCard } from '@/components/chat/compare-result-card';
import { Badge } from '@/components/ui/badge';
import { ParallelModelStatus } from '@/enums';
import { useParallelMessageGroup } from '@/hooks/chat/use-parallel-message-group';
import type { ParallelMessageGroupProps } from '@/types';
import { getParallelColClass } from '@/utilities';

export function ParallelMessageGroup({
  messages,
  t,
}: ParallelMessageGroupProps): React.ReactElement {
  // In-thread compare results reuse the same rich card as /chat/compare:
  // Raw / Copy / Download .md toolbar + Latency / Tokens / Judge / Image
  // delivery footer strip. One component, two surfaces — no JSX duplication.
  const { responses, fastestModel, bestModel } = useParallelMessageGroup(messages);
  const colClass = getParallelColClass(messages.length);

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">{t('compare.title')}</span>
        <Badge variant="secondary" className="text-xs">
          {t('compare.modelCount', { count: messages.length })}
        </Badge>
      </div>

      <div className={`grid gap-3 ${colClass}`}>
        {responses.map((response) => (
          <CompareResultCard
            key={`${response.provider}:${response.model}`}
            response={response}
            isFastest={
              response.status === ParallelModelStatus.COMPLETED && response.model === fastestModel
            }
            isBest={
              response.status === ParallelModelStatus.COMPLETED &&
              response.model === bestModel &&
              bestModel !== fastestModel
            }
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
