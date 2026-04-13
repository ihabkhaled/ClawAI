import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SubTaskResultCardProps } from '@/types';

export function SubTaskResultCard({ subTask, index, t }: SubTaskResultCardProps) {
  return (
    <Card className="border-muted">
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{String(index + 1)}.</span>
          <CardTitle className="text-sm">{subTask.title}</CardTitle>
          <Badge variant="secondary" className="ms-auto text-xs">
            {t('decompose.category')}: {subTask.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="mb-2 whitespace-pre-wrap text-sm text-foreground">{subTask.result}</p>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>
            {t('decompose.model')}: {subTask.model}
          </span>
          <span>
            {t('decompose.latencyMs')}: {String(subTask.latencyMs)}ms
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
