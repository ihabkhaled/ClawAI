import { CheckCircle, Loader2, Play, X } from 'lucide-react';

import { CompareJudgeControls } from '@/components/chat/compare-judge-controls';
import { ParallelModelSelector } from '@/components/chat/parallel-model-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { InThreadComparePanelProps } from '@/types';

export function InThreadComparePanel({
  selectedModels,
  onToggleModel,
  onCompare,
  onClose,
  result,
  isPending,
  canSend,
  judgeEnabled,
  onJudgeEnabledChange,
  judgeModel,
  onJudgeModelChange,
  judgeModelOptions,
  judgeModelOptionsLoading,
  t,
}: InThreadComparePanelProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {t('compare.title')}
          <Badge variant="secondary" className="text-xs">
            {selectedModels.length} {t('nav.models')}
          </Badge>
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <ParallelModelSelector
          selectedModels={selectedModels}
          onToggleModel={onToggleModel}
          selectionError={null}
          t={t}
        />

        <CompareJudgeControls
          judgeEnabled={judgeEnabled}
          onJudgeEnabledChange={onJudgeEnabledChange}
          judgeModel={judgeModel}
          onJudgeModelChange={onJudgeModelChange}
          judgeModelOptions={judgeModelOptions}
          judgeModelOptionsLoading={judgeModelOptionsLoading}
          t={t}
        />

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem('compare-prompt') as HTMLInputElement;
            if (input.value.trim()) {
              onCompare(input.value);
              input.value = '';
            }
          }}
        >
          <Input
            name="compare-prompt"
            placeholder={t('compare.description')}
            className="flex-1"
            disabled={isPending}
          />
          <Button type="submit" disabled={!canSend || isPending} size="sm">
            {isPending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="me-2 h-4 w-4" />
            )}
            {isPending ? t('compare.comparing') : t('compare.sendPrompt')}
          </Button>
        </form>

        {result ? (
          <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">
              {t('compare.processingMessage', { count: selectedModels.length })}
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
