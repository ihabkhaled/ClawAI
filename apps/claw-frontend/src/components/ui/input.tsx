import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  // Opt-in error state. Toggling this flips the border to destructive and
  // swaps the focus ring tint — the actual rules live in `globals.css` under
  // the `.input-error` + `.input-focus-ring` component classes, so consumers
  // only flip a boolean.
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        aria-invalid={error ? true : undefined}
        // The default focus ring still ships via the existing
        // `focus-visible:ring-*` Tailwind classes; `.input-focus-ring` layers
        // the new primary/50 tinted box-shadow on top. They coexist so
        // existing usages of <Input /> keep their visuals unchanged.
        className={cn(
          "input-focus-ring flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error ? "input-error" : null,
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
