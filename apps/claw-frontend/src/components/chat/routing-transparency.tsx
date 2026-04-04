import { useState } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";

import { RoutingBadge } from "@/components/chat/routing-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONFIDENCE_THRESHOLDS } from "@/constants";
import { cn } from "@/lib/utils";
import type { RoutingDecision } from "@/types";

type RoutingTransparencyProps = {
  decision: RoutingDecision;
};

function getConfidenceLabel(confidence: number | null): string {
  if (confidence === null) return "N/A";
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return "High";
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return "Medium";
  return "Low";
}

function getConfidenceClass(confidence: number | null): string {
  if (confidence === null) return "text-muted-foreground";
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return "text-emerald-600";
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return "text-amber-600";
  return "text-destructive";
}

export function RoutingTransparency({
  decision,
}: RoutingTransparencyProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-1 rounded-md border bg-card p-2 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">{decision.selectedProvider}</Badge>
        <Badge variant="outline">{decision.selectedModel}</Badge>
        <RoutingBadge mode={decision.routingMode} />
        <span className={cn("font-medium", getConfidenceClass(decision.confidence))}>
          {getConfidenceLabel(decision.confidence)}
          {decision.confidence !== null
            ? ` (${Math.round(decision.confidence * 100)}%)`
            : ""}
        </span>
        {decision.reasonTags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-6 px-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </div>

      {isExpanded ? (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-t pt-2 text-xs">
          <div>
            <span className="text-muted-foreground">Privacy class: </span>
            <span>{decision.privacyClass ?? "N/A"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Cost class: </span>
            <span>{decision.costClass ?? "N/A"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Fallback provider: </span>
            <span>{decision.fallbackProvider ?? "None"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Fallback model: </span>
            <span>{decision.fallbackModel ?? "None"}</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Decision ID: </span>
            <span className="font-mono">{decision.id}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
