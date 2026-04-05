import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ROUTING_MODE_LABELS } from '@/constants';
import type { RoutingMode } from '@/enums';
import type { MessageProvenanceProps } from '@/types';
import { estimateCost, formatLatency } from '@/utilities';

export function MessageProvenance({ message }: MessageProvenanceProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasProvenance =
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
        onClick={() => setIsExpanded(!isExpanded)}
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
