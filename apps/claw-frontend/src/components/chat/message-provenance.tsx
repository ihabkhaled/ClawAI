import { ChevronDown, ChevronUp, Info } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ROUTING_MODE_LABELS } from '@/constants';
import type { RoutingMode } from '@/enums';
import { useToggle } from '@/hooks/common/use-toggle';
import type { MessageProvenanceProps } from '@/types';
import { estimateCost, formatLatency } from '@/utilities';

export function MessageProvenance({ message }: MessageProvenanceProps) {
  const { isOpen: isExpanded, toggle: toggleExpanded } = useToggle(false);
  const metadata = message.metadata as Record<string, unknown> | null;
  const routeRoadmap = metadata?.['routeRoadmap'] as
    | {
        routerModel?: string | null;
        research?: {
          workflow?: string | null;
          toolsUsed?: string[];
          itemCount?: number;
          warningCount?: number;
        } | null;
        finalDisplayName?: string | null;
        finalProvider?: string | null;
        finalModel?: string | null;
        steps?: Array<{
          stage?: string;
          provider?: string;
          model?: string;
          displayName?: string | null;
          description?: string | null;
        }>;
      }
    | undefined;
  const progressSummary = Array.isArray(metadata?.['progressSummary'])
    ? (metadata['progressSummary'] as Array<{
        label?: string;
        description?: string | null;
        actorType?: string;
        actorName?: string | null;
        status?: string;
      }>)
    : [];
  const routePath = Array.isArray(routeRoadmap?.steps)
    ? routeRoadmap.steps
        .map((step) => {
          const stagePrefix = typeof step.stage === 'string' ? `${step.stage}: ` : '';
          const display = step.displayName ?? step.model ?? 'unknown';
          const provider = step.provider ?? 'unknown';
          return `${stagePrefix}${provider}/${display}`;
        })
        .join(' -> ')
    : null;
  const researchSummary = routeRoadmap?.research ?? null;

  const hasProvenance =
    routeRoadmap !== undefined ||
    message.provider !== null ||
    message.model !== null ||
    message.latencyMs !== null ||
    message.inputTokens !== null ||
    message.outputTokens !== null;

  if (!hasProvenance) {
    return null;
  }

  const cost = estimateCost(message.provider, message.inputTokens, message.outputTokens);

  return (
    <div className="mt-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 gap-1 px-1.5 text-xs text-muted-foreground"
        onClick={toggleExpanded}
        aria-label="Toggle message provenance"
      >
        <Info className="h-3 w-3" />
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      {isExpanded ? (
        <div className="mt-1 rounded-md border bg-card p-2.5 text-xs">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {message.provider !== null ? (
              <div>
                <span className="text-muted-foreground">Provider: </span>
                <Badge variant="outline" className="text-xs">
                  {message.provider}
                </Badge>
              </div>
            ) : null}

            {message.model !== null ? (
              <div>
                <span className="text-muted-foreground">Model: </span>
                <Badge variant="outline" className="text-xs">
                  {message.model}
                </Badge>
              </div>
            ) : null}

            {routeRoadmap?.routerModel ? (
              <div className="col-span-2">
                <span className="text-muted-foreground">Router model: </span>
                <Badge variant="outline" className="text-xs">
                  {routeRoadmap.routerModel}
                </Badge>
              </div>
            ) : null}

            {routePath ? (
              <div className="col-span-2">
                <span className="text-muted-foreground">Route path: </span>
                <span>{routePath}</span>
              </div>
            ) : null}

            {researchSummary ? (
              <div className="col-span-2">
                <span className="text-muted-foreground">Research: </span>
                <span>
                  {researchSummary.workflow ?? 'unknown'}
                  {typeof researchSummary.itemCount === 'number'
                    ? ` • ${String(researchSummary.itemCount)} items`
                    : ''}
                  {Array.isArray(researchSummary.toolsUsed) && researchSummary.toolsUsed.length > 0
                    ? ` • ${researchSummary.toolsUsed.join(', ')}`
                    : ''}
                  {typeof researchSummary.warningCount === 'number' &&
                  researchSummary.warningCount > 0
                    ? ` • ${String(researchSummary.warningCount)} warnings`
                    : ''}
                </span>
              </div>
            ) : null}

            {progressSummary.length > 0 ? (
              <div className="col-span-2">
                <span className="text-muted-foreground">Progress summary: </span>
                <div className="mt-1 flex flex-col gap-1">
                  {progressSummary.map((step, index) => (
                    <div
                      key={`${step.label ?? 'step'}-${String(index)}`}
                      className="rounded-md border border-border/60 px-2 py-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{step.label ?? 'Step'}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {step.status ?? 'completed'}
                        </Badge>
                      </div>
                      {typeof step.description === 'string' && step.description.length > 0 ? (
                        <div className="text-muted-foreground">{step.description}</div>
                      ) : null}
                      {typeof step.actorName === 'string' && step.actorName.length > 0 ? (
                        <div className="text-muted-foreground">Actor: {step.actorName}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {message.latencyMs !== null ? (
              <div>
                <span className="text-muted-foreground">Latency: </span>
                <span>{formatLatency(message.latencyMs)}</span>
              </div>
            ) : null}

            {message.inputTokens !== null ? (
              <div>
                <span className="text-muted-foreground">Input tokens: </span>
                <span>{message.inputTokens.toLocaleString()}</span>
              </div>
            ) : null}

            {message.outputTokens !== null ? (
              <div>
                <span className="text-muted-foreground">Output tokens: </span>
                <span>{message.outputTokens.toLocaleString()}</span>
              </div>
            ) : null}

            {cost !== null ? (
              <div>
                <span className="text-muted-foreground">Estimated cost: </span>
                <span>{cost}</span>
              </div>
            ) : null}

            {message.routingMode !== null ? (
              <div>
                <span className="text-muted-foreground">Routing mode: </span>
                <span>
                  {ROUTING_MODE_LABELS[message.routingMode as RoutingMode] ?? message.routingMode}
                </span>
              </div>
            ) : null}

            <div>
              <span className="text-muted-foreground">Fallback used: </span>
              <span>{message.usedFallback ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
