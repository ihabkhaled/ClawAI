'use client';

import { Loader2, Send, Users } from 'lucide-react';

import { RolePackResultCard } from '@/components/chat/role-pack-result-card';
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
import { ROLE_PACK_OPTIONS } from '@/constants';
import type { RolePackName } from '@/enums/role-pack.enum';
import { useRolePackPage } from '@/hooks/chat/use-role-pack-page';

export default function RolePackPage(): React.ReactElement {
  const {
    t,
    content,
    setContent,
    pack,
    setPack,
    handleSend,
    canSend,
    isPending,
    isError,
    isRolePackError,
    rolePackResult,
    isPolling,
    isRolePackReady,
    handleViewInThread,
  } = useRolePackPage();

  const hasAnyError = isError || isRolePackError;
  const showLoading = isPending || (isPolling && !isRolePackReady && !isRolePackError);
  const showResults = isRolePackReady && rolePackResult !== null;
  const showEmpty = !isPending && !isPolling && !isRolePackReady && !hasAnyError;

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader title={t('rolePack.title')} description={t('rolePack.description')} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="pt-4">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="role-pack-content">
                {t('rolePack.contentLabel')}
              </label>
              <Textarea
                id="role-pack-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('rolePack.contentPlaceholder')}
                className="min-h-[160px] resize-y"
              />
              <div className="mt-3 flex justify-end">
                <Button onClick={handleSend} disabled={!canSend}>
                  {isPending || isPolling ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="me-2 h-4 w-4" />
                  )}
                  {isPending || isPolling ? t('rolePack.running') : t('rolePack.sendPrompt')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-4">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="role-pack-select">
                {t('rolePack.packLabel')}
              </label>
              <Select value={pack} onValueChange={(v) => setPack(v as RolePackName)}>
                <SelectTrigger id="role-pack-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_PACK_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <p className="text-center text-sm text-muted-foreground">{t('rolePack.synthesizing')}</p>
        </div>
      ) : null}

      {showResults && rolePackResult !== null ? (
        <RolePackResultCard result={rolePackResult} onViewInThread={handleViewInThread} t={t} />
      ) : null}

      {hasAnyError ? (
        <Card className="border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{t('rolePack.sendFailed')}</p>
        </Card>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={Users}
          title={t('rolePack.noResults')}
          description={t('rolePack.description')}
        />
      ) : null}
    </div>
  );
}
