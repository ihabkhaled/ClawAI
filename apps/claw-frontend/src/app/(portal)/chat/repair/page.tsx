'use client';

import { Loader2, Send, Wrench } from 'lucide-react';

import { RepairResultCard } from '@/components/chat/repair-result-card';
import { RepairTypeSelector } from '@/components/chat/repair-type-selector';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useRepairPage } from '@/hooks/chat/use-repair-page';

export default function RepairPage() {
  const {
    t,
    content,
    setContent,
    selectedRepairTypes,
    handleToggleRepairType,
    handleSend,
    isPending,
    isError,
    canSend,
    repairMessage,
    isPolling,
    isRepairReady,
    handleViewInThread,
  } = useRepairPage();

  const showLoading = isPending || (isPolling && !isRepairReady);
  const showResults = isRepairReady && repairMessage !== null;
  const showEmpty = !isPending && !isPolling && !isRepairReady && !isError;

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader title={t('repair.title')} description={t('repair.description')} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="pt-4">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="repair-content">
                {t('repair.contentLabel')}
              </label>
              <Textarea
                id="repair-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('repair.contentPlaceholder')}
                className="min-h-[160px] resize-y"
              />
              <div className="mt-3 flex justify-end">
                <Button onClick={handleSend} disabled={!canSend}>
                  {isPending || isPolling ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="me-2 h-4 w-4" />
                  )}
                  {isPending || isPolling ? t('repair.running') : t('repair.sendPrompt')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-4">
              <RepairTypeSelector
                selectedTypes={selectedRepairTypes}
                onToggle={handleToggleRepairType}
                t={t}
              />
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
          <p className="text-center text-sm text-muted-foreground">{t('repair.synthesizing')}</p>
        </div>
      ) : null}

      {showResults && repairMessage !== null ? (
        <RepairResultCard result={repairMessage} onViewInThread={handleViewInThread} t={t} />
      ) : null}

      {isError ? (
        <Card className="border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{t('repair.sendFailed')}</p>
        </Card>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={Wrench}
          title={t('repair.noResults')}
          description={t('repair.description')}
        />
      ) : null}
    </div>
  );
}
