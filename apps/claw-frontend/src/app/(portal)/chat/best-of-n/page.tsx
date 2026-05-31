'use client';

import { Loader2, Send, Trophy } from 'lucide-react';

import { AdvancedModuleModelSelector } from '@/components/chat/advanced-module-model-selector';
import { BestOfNResultCard } from '@/components/chat/best-of-n-result-card';
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
import { useBestOfNPage } from '@/hooks/chat/use-best-of-n-page';

export default function BestOfNPage(): React.ReactElement {
  const {
    t,
    content,
    setContent,
    n,
    setN,
    selectedModel,
    setSelectedModel,
    handleSend,
    canSend,
    isPending,
    isError,
    isBestOfNError,
    bestOfNResult,
    isPolling,
    isBestOfNReady,
    handleViewInThread,
  } = useBestOfNPage();

  const hasAnyError = isError || isBestOfNError;
  const showLoading = isPending || (isPolling && !isBestOfNReady && !isBestOfNError);
  const showResults = isBestOfNReady && bestOfNResult !== null;
  const showEmpty = !isPending && !isPolling && !isBestOfNReady && !hasAnyError;

  return (
    <div className="space-y-6">
      <PageHeader title={t('bestOfN.title')} description={t('bestOfN.description')} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="pt-4">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="best-of-n-content">
                {t('bestOfN.contentLabel')}
              </label>
              <Textarea
                id="best-of-n-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('bestOfN.contentPlaceholder')}
                className="min-h-[160px] resize-y"
              />
              <div className="mt-3 flex justify-end">
                <Button onClick={handleSend} disabled={!canSend}>
                  {isPending || isPolling ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="me-2 h-4 w-4" />
                  )}
                  {isPending || isPolling ? t('bestOfN.running') : t('bestOfN.sendPrompt')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-4">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="n-candidates">
                {t('bestOfN.nCandidates')}
              </label>
              <Select value={String(n)} onValueChange={(val) => setN(Number(val))}>
                <SelectTrigger id="n-candidates" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
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
          <p className="text-center text-sm text-muted-foreground">{t('bestOfN.synthesizing')}</p>
        </div>
      ) : null}

      {showResults && bestOfNResult !== null ? (
        <BestOfNResultCard result={bestOfNResult} onViewInThread={handleViewInThread} t={t} />
      ) : null}

      {hasAnyError ? (
        <Card className="border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{t('bestOfN.sendFailed')}</p>
        </Card>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={Trophy}
          title={t('bestOfN.noResults')}
          description={t('bestOfN.description')}
        />
      ) : null}
    </div>
  );
}
