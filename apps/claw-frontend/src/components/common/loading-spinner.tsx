import { Loader2 } from "lucide-react";

import { ComponentSize } from "@/enums";
import { cn } from "@/lib/utils";
import type { LoadingSpinnerProps } from "@/types";

const sizeClasses = {
  [ComponentSize.SM]: "h-4 w-4",
  [ComponentSize.MD]: "h-8 w-8",
  [ComponentSize.LG]: "h-12 w-12",
} as const;

export function LoadingSpinner({
  className,
  size = ComponentSize.MD,
  label = "Loading...",
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center gap-3",
        className,
      )}
      role="status"
      aria-label={label}
    >
      <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
