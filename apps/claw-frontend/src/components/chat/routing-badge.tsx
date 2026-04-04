import { Badge } from "@/components/ui/badge";
import { ROUTING_MODE_LABELS } from "@/constants";
import { cn } from "@/lib/utils";
import type { RoutingMode } from "@/enums";

type RoutingBadgeProps = {
  mode: RoutingMode;
  className?: string;
};

export function RoutingBadge({ mode, className }: RoutingBadgeProps) {
  return (
    <Badge variant="secondary" className={cn("text-xs", className)}>
      {ROUTING_MODE_LABELS[mode]}
    </Badge>
  );
}
