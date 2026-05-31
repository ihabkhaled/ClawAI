import { Badge } from "@/components/ui/badge";
import { STATUS_STYLES, STATUS_SR_KEYS } from "@/constants";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { StatusBadgeProps } from "@/types";

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();
  const style = STATUS_STYLES[status] ?? STATUS_STYLES["inactive"];
  // Screen-reader prefix so the badge announces both its semantic class
  // ("Success: active") and its display label, instead of relying on colour
  // alone to convey meaning (WCAG 1.4.1 — Use of Color).
  const srKey =
    STATUS_SR_KEYS[status] ?? STATUS_SR_KEYS["inactive"] ?? "accessibility.statusInfo";
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", style, className)}
    >
      <span className="sr-only">{t(srKey)}: </span>
      {status}
    </Badge>
  );
}
