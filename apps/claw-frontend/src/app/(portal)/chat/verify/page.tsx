'use client';

import { Loader2, Send, ShieldCheck } from 'lucide-react';

import { AdvancedModuleModelSelector } from '@/components/chat/advanced-module-model-selector';
import { VerifyResultCard } from '@/components/chat/verify-result-card';
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
import { useVerifyPage } from '@/hooks/chat/use-verify-page';

export default function VerifyPage(): React.ReactElement {
  const {
    t,
    content,
    setContent,
    maxRevisions,
    setMaxRevisions,
    selectedModel,
    setSelectedModel,
    handleSend,
    canSend,
    isPending,
    isError,
    isVerifyError,
    verifyResult,
    isPolling,
    isVerifyReady,
    handleViewInThread,
  } = useVerifyPage();

  const hasAnyError = isError || isVerifyError;
  const showLoading = isPending || (isPolling && !isVerifyReady && !isVerifyError);
  const showResults = isVerifyReady && verifyResult !== null;
  const showEmpty = !isPending && !isPolling && !isVerifyReady && !hasAnyError;

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader title={t('verify.title')} description={t('verify.description')} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="pt-4">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="verify-content">
                {t('verify.contentLabel')}
              </label>
              <Textarea
                id="verify-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('verify.contentPlaceholder')}
                className="min-h-[160px] resize-y"
              />
              <div className="mt-3 flex justify-end">
                <Button onClick={handleSend} disabled={!canSend}>
                  {isPending || isPolling ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="me-2 h-4 w-4" />
                  )}
                  {isPending || isPolling ? t('verify.running') : t('verify.sendPrompt')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-4">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="max-revisions">
                {t('verify.maxRevisionsLabel')}
              </label>
              <Select
                value={String(maxRevisions)}
                onValueChange={(val) => setMaxRevisions(Number(val))}
              >
                <SelectTrigger id="max-revisions">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
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
          <p className="text-center text-sm text-muted-foreground">{t('verify.synthesizing')}</p>
        </div>
      ) : null}

      {showResults && verifyResult !== null ? (
        <VerifyResultCard result={verifyResult} onViewInThread={handleViewInThread} t={t} />
      ) : null}

      {hasAnyError ? (
        <Card className="border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{t('verify.sendFailed')}</p>
        </Card>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={ShieldCheck}
          title={t('verify.noResults')}
          description={t('verify.description')}
        />
      ) : null}
    </div>
  );
}
