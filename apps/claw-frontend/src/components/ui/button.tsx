import { Slot } from '@radix-ui/react-slot';
import type { VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  // When true, the button is disabled and a leading spinner is shown before the
  // children. The label stays mounted so the button keeps its width (no layout
  // jump). Ignored when `asChild` is set, since the child owns its own content.
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      disabled,
      children,
      type,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        // HTML defaults a bare <button> to type="submit". Most buttons in this
        // app are not submit buttons, and a component library that inherits the
        // spec default turns "a button was added inside a form" into "the form
        // submits when that button is clicked" — a bug that appears later, in a
        // different file, when someone wraps a region in a <form>. Defaulting to
        // "button" makes submitting the deliberate act it should be.
        type={type ?? 'button'}
        disabled={disabled ?? isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden /> : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
