import { ArrowDown, ArrowUp, ChevronRight, Trash2 } from 'lucide-react';
import type * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MAX_CHAIN_STEPS } from '@/constants';
import { useAvailableModels } from '@/hooks/chat/use-available-models';
import type { EscalationChainBuilderProps } from '@/types';
import { cn, isModelInChain } from '@/utilities';

export function EscalationChainBuilder({
  chainModels,
  onAddModel,
  onRemoveModel,
  onMoveUp,
  onMoveDown,
  selectionError,
  t,
}: EscalationChainBuilderProps): React.ReactElement {
  const { groupedModels, isLoading } = useAvailableModels();

  const isMaxReached = chainModels.length >= MAX_CHAIN_STEPS;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pt-4 pb-2">
          <CardTitle className="text-sm font-medium">{t('escalation.chainBuilder')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {chainModels.length === 0 ? (
            <p className="text-muted-foreground text-xs">{t('escalation.addModel')}</p>
          ) : null}

          {chainModels.map((step, index) => (
            <div
              key={`${step.provider}/${step.model}/${String(index)}`}
              className="bg-muted/30 flex items-center gap-2 rounded-md border px-3 py-2"
            >
              <Badge variant="outline" className="shrink-0 text-xs">
                {index + 1}
              </Badge>
              <ChevronRight className="text-muted-foreground h-3 w-3 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {step.provider} / {step.model}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={index === 0}
                  onClick={() => onMoveUp(index)}
                  title={t('escalation.moveUp')}
                  aria-label={t('escalation.moveUp')}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={index === chainModels.length - 1}
                  onClick={() => onMoveDown(index)}
                  title={t('escalation.moveDown')}
                  aria-label={t('escalation.moveDown')}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive h-7 w-7"
                  onClick={() => onRemoveModel(index)}
                  title={t('escalation.removeModel')}
                  aria-label={t('escalation.removeModel')}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {selectionError ? <p className="text-destructive text-xs">{selectionError}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pt-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{t('escalation.addModel')}</CardTitle>
            <span className="text-muted-foreground text-xs">
              {chainModels.length}/{MAX_CHAIN_STEPS}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
          ) : (
            <div className="max-h-64 space-y-4 overflow-y-auto rounded-md border p-3">
              {groupedModels
                .filter((g) => !g.provider.startsWith('IMAGE_'))
                .map((group) => (
                  <div key={group.provider}>
                    <p className="text-muted-foreground mb-1.5 text-xs font-semibold uppercase">
                      {group.label}
                    </p>
                    <div className="space-y-1">
                      {group.models.map((model) => {
                        const inChain = isModelInChain(chainModels, model.provider, model.model);
                        const isLocked = model.isLocked === true;
                        const disabled = (!inChain && isMaxReached) || isLocked;
                        return (
                          <Button
                            key={`${model.provider}:${model.model}`}
                            variant="ghost"
                            size="sm"
                            disabled={disabled}
                            className={cn(
                              'w-full justify-start text-sm',
                              inChain && 'opacity-40',
                              isLocked && 'opacity-50',
                            )}
                            onClick={() => {
                              if (!inChain) {
                                onAddModel(model.provider, model.model);
                              }
                            }}
                          >
                            <span className="truncate">{model.displayName}</span>
                            {isLocked ? (
                              <span className="border-border bg-muted text-muted-foreground ms-auto shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none">
                                {t('chat.modelSelector.notOnPlan')}
                              </span>
                            ) : null}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
