import { Trash2 } from 'lucide-react';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SMART_ROUTER_PROVIDER_LABEL_KEYS } from '@/constants/smart-router-admin.constants';
import { useAssistantModels } from '@/hooks/admin/use-assistant-models';
import type { SmartRouterAssistantRoleSectionProps } from '@/types/smart-router-admin.types';

import { SmartRouterAssistantAddForm } from './smart-router-assistant-add-form';

/**
 * One assistant-model role: its ordered candidates, add and remove.
 *
 * Candidates are tried in order, so the first row is the one that normally
 * answers and the rest exist for when it cannot be reached. The models used
 * to live in environment variables or in code (the file writers were
 * hard-coded), which meant a redeploy per change and no validation at all.
 */
export function SmartRouterAssistantRoleSection({
  role,
  titleKey,
  descriptionKey,
  emptyKey,
  t,
}: SmartRouterAssistantRoleSectionProps): React.ReactElement {
  const { entries, isLoading, isError, error, replace, isReplacePending } =
    useAssistantModels(role);

  if (isLoading) {
    return <LoadingSpinner label={t('common.loading')} />;
  }

  if (isError) {
    return (
      <div
        className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm"
        role="alert"
      >
        {error?.message ?? t('common.error')}
      </div>
    );
  }

  const toInput = (entry: (typeof entries)[number]) => ({
    provider: entry.provider,
    modelAlias: entry.modelAlias,
    deploymentId: entry.deploymentId ?? undefined,
    enabled: entry.enabled,
    timeoutMs: entry.timeoutMs,
    maxTokens: entry.maxTokens,
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">{t(titleKey)}</p>
        <p className="text-muted-foreground text-sm">{t(descriptionKey)}</p>
      </div>

      {entries.length === 0 ? (
        // An empty list is a valid configuration; what it means is role-specific.
        <p className="text-muted-foreground text-sm">{t(emptyKey)}</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <Card key={entry.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {t('smartRouterAdmin.entryRow.orderPrefix')} #{entry.order}
                    </span>
                    <Badge variant="outline">
                      {t(SMART_ROUTER_PROVIDER_LABEL_KEYS[entry.provider])}
                    </Badge>
                    {index === 0 ? (
                      <Badge variant="secondary">
                        {t('smartRouterAdmin.assistant.firstChoiceBadge')}
                      </Badge>
                    ) : null}
                    {!entry.enabled ? (
                      <Badge variant="destructive">
                        {t('smartRouterAdmin.entryRow.disabledBadge')}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-sm font-medium">{entry.modelAlias}</p>
                  <p className="text-muted-foreground text-xs">
                    {entry.timeoutMs}
                    {t('smartRouterAdmin.entryRow.timeoutSuffix')} · {entry.maxTokens}
                    {t('smartRouterAdmin.assistant.tokenSuffix')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive h-8 w-8 shrink-0"
                  disabled={isReplacePending}
                  aria-label={t('common.delete')}
                  onClick={() =>
                    replace(entries.filter((_, other) => other !== index).map(toInput))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SmartRouterAssistantAddForm
        isPending={isReplacePending}
        onAdd={(input) => replace([...entries.map(toInput), input])}
        t={t}
      />
    </div>
  );
}
