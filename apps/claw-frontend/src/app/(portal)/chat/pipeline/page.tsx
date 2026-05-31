'use client';

import { Layers, Loader2, Send } from 'lucide-react';

import { AdvancedModuleModelSelector } from '@/components/chat/advanced-module-model-selector';
import { PipelineResultCard } from '@/components/chat/pipeline-result-card';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { PIPELINE_TEMPLATE_OPTIONS } from '@/constants';
import { usePipelinePage } from '@/hooks/chat/use-pipeline-page';

export default function PipelinePage(): React.ReactElement {
  const {
    t,
    content,
    setContent,
    template,
    setTemplate,
    selectedModel,
    setSelectedModel,
    handleSend,
    canSend,
    isPending,
    isError,
    isPipelineError,
    pipelineResult,
    isPolling,
    isPipelineReady,
    handleViewInThread,
  } = usePipelinePage();

  const hasAnyError = isError || isPipelineError;
  const showLoading = isPending || (isPolling && !isPipelineReady && !isPipelineError);
  const showResults = isPipelineReady && pipelineResult !== null;
  const showEmpty = !isPending && !isPolling && !isPipelineReady && !hasAnyError;

  return (
    <div className="space-y-6">
      <PageHeader title={t('pipeline.title')} description={t('pipeline.description')} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="pt-4">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="pipeline-content">
                {t('pipeline.contentLabel')}
              </label>
              <Textarea
                id="pipeline-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('pipeline.contentPlaceholder')}
                className="min-h-[160px] resize-y"
              />
              <div className="mt-3 flex justify-end">
                <Button onClick={handleSend} disabled={!canSend}>
                  {isPending || isPolling ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="me-2 h-4 w-4" />
                  )}
                  {isPending || isPolling ? t('pipeline.running') : t('pipeline.sendPrompt')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-4">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="pipeline-template">
                {t('pipeline.templateLabel')}
              </label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger id="pipeline-template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_TEMPLATE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-4">
                <AdvancedModuleModelSelector
                  t={t}
                  value={selectedModel}
                  onChange={setSelectedModel}
                  disabled={isPending || isPolling}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showLoading ? (
        <div className="space-y-4">
          <Card className="p-4">
            <Skeleton className="mb-2 h-4 w-1/2" />
            <Skeleton className="mb-2 h-3 w-full" />
            <Skeleton className="mb-2 h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
          </Card>
          <p className="text-center text-sm text-muted-foreground">{t('pipeline.synthesizing')}</p>
        </div>
      ) : null}

      {showResults && pipelineResult !== null ? (
        <PipelineResultCard result={pipelineResult} onViewInThread={handleViewInThread} t={t} />
      ) : null}

      {hasAnyError ? (
        <Card className="border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{t('pipeline.sendFailed')}</p>
        </Card>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={Layers}
          title={t('pipeline.noResults')}
          description={t('pipeline.description')}
        />
      ) : null}
    </div>
  );
}
