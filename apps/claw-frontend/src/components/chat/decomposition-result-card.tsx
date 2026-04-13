import { ExternalLink } from 'lucide-react';

import { SubTaskResultCard } from '@/components/chat/sub-task-result-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DecompositionResultCardProps } from '@/types';

export function DecompositionResultCard({
  result,
  onViewInThread,
  t,
}: DecompositionResultCardProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('decompose.resultTitle')}</CardTitle>
            <Button variant="outline" size="sm" onClick={onViewInThread}>
              <ExternalLink className="me-2 h-3 w-3" />
              {t('decompose.viewInThread')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-foreground">{result.content}</p>
        </CardContent>
      </Card>

      {result.metadata.subTasks.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t('decompose.subTasksHeader')}
          </h3>
          {result.metadata.subTasks.map((subTask, i) => (
            <SubTaskResultCard key={subTask.title} subTask={subTask} index={i} t={t} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
