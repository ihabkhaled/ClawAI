import { Trash2 } from 'lucide-react';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SMART_ROUTER_PROVIDER_LABEL_KEYS } from '@/constants/smart-router-admin.constants';
import { useAssistantModels } from '@/hooks/admin/use-assistant-models';
import {
  ASSISTANT_MODEL_ROLE_RESEARCH_GATE,
  type SmartRouterAssistantTabProps,
} from '@/types/smart-router-admin.types';

import { SmartRouterAssistantAddForm } from './smart-router-assistant-add-form';

/**
 * Who decides whether a turn needs the web, before any answering model runs.
 *
 * This lived in environment variables, which meant changing the model was a
 * redeploy and the name was validated against nothing — a retired model would
 * fail closed forever, silently answering "no research needed" to everything.
 *
 * Candidates are tried in order, so the first row is the one that normally
 * answers and the rest exist for when it cannot be reached.
 */
export function SmartRouterAssistantTab({ t }: SmartRouterAssistantTabProps): React.ReactElement {
  const { entries, isLoading, isError, error, replace, isReplacePending } = useAssistantModels(
    ASSISTANT_MODEL_ROLE_RESEARCH_GATE,
  );

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
        <p className="text-sm font-medium">{t('smartRouterAdmin.assistant.researchGateTitle')}</p>
        <p className="text-muted-foreground text-sm">
          {t('smartRouterAdmin.assistant.researchGateDescription')}
        </p>
      </div>

      {entries.length === 0 ? (
        // An empty list is a valid configuration, not a broken one: it means the
        // gate never runs, and a gate that never runs answers "no web".
        <p className="text-muted-foreground text-sm">
          {t('smartRouterAdmin.assistant.emptyMeansDisabled')}
        </p>
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
