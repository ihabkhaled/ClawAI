import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StatusBadgeProps } from "@/types";

const statusStyles: Record<string, string> = {
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  inactive:
    "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 dark:border-slate-800",
  error:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status] ?? statusStyles["inactive"];
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", style, className)}
    >
      {status}
    </Badge>
  );
}
