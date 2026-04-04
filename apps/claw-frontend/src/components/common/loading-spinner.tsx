import { Loader2 } from "lucide-react";

import { SPINNER_SIZE_CLASSES } from "@/constants";
import { ComponentSize } from "@/enums";
import { cn } from "@/lib/utils";
import type { LoadingSpinnerProps } from "@/types";

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
      <Loader2 className={cn("animate-spin text-muted-foreground", SPINNER_SIZE_CLASSES[size])} />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
