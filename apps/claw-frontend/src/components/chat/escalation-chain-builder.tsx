import { ArrowDown, ArrowUp, ChevronRight, Trash2 } from 'lucide-react';

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
}: EscalationChainBuilderProps) {
  const { groupedModels, isLoading } = useAvailableModels();

  const isMaxReached = chainModels.length >= MAX_CHAIN_STEPS;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-medium">{t('escalation.chainBuilder')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {chainModels.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('escalation.addModel')}</p>
          ) : null}

          {chainModels.map((step, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2"
            >
              <Badge variant="outline" className="shrink-0 text-xs">
                {index + 1}
              </Badge>
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
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
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onRemoveModel(index)}
                  title={t('escalation.removeModel')}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {selectionError ? <p className="text-xs text-destructive">{selectionError}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{t('escalation.addModel')}</CardTitle>
            <span className="text-xs text-muted-foreground">
              {chainModels.length}/{MAX_CHAIN_STEPS}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : (
            <div className="max-h-64 space-y-4 overflow-y-auto rounded-md border p-3">
              {groupedModels
                .filter((g) => !g.provider.startsWith('IMAGE_'))
                .map((group) => (
                  <div key={group.provider}>
                    <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                      {group.label}
                    </p>
                    <div className="space-y-1">
                      {group.models.map((model) => {
                        const inChain = isModelInChain(chainModels, model.provider, model.model);
                        const disabled = !inChain && isMaxReached;
                        return (
                          <Button
                            key={`${model.provider}:${model.model}`}
                            variant="ghost"
                            size="sm"
                            disabled={disabled}
                            className={cn('w-full justify-start text-sm', inChain && 'opacity-40')}
                            onClick={() => {
                              if (!inChain) {
                                onAddModel(model.provider, model.model);
                              }
                            }}
                          >
                            <span className="truncate">{model.displayName}</span>
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
