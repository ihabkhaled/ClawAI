import { Badge } from "@/components/ui/badge";
import { STATUS_STYLES } from "@/constants";
import { cn } from "@/lib/utils";
import type { StatusBadgeProps } from "@/types";

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES["inactive"];
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", style, className)}
    >
      {status}
    </Badge>
  );
}
