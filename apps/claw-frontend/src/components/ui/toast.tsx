'use client';

import * as ToastPrimitives from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import * as React from 'react';

import {
  TOAST_VARIANT_CONTAINER_CLASSES,
  TOAST_VARIANT_ICON_CLASSES,
  TOAST_VARIANT_PROGRESS_CLASSES,
  TOAST_VARIANT_ICONS,
} from '@/constants/toast.constants';
import { ToastVariant } from '@/enums/toast-variant.enum';
import { cn } from '@/lib/utils';

const ToastProvider = ToastPrimitives.Provider;

// Mobile (default) viewport: pinned to the top with safe-area padding so it
// never clashes with the new mobile bottom nav. From `sm:` up we float it to
// the bottom-right corner — the historical desktop position — but keep a
// max-width so multi-line toasts stay readable.
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'safe-top safe-top-base-4 fixed top-0 z-[100] flex max-h-screen w-full flex-col gap-2 px-4 pb-4 sm:top-auto sm:right-0 sm:bottom-0 sm:flex-col-reverse md:max-w-[420px]',
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

// Container animation classes carry over from the original shadcn build so
// swipe-to-dismiss and slide-in still feel right. We compose the semantic
// variant on top via TOAST_VARIANT_CONTAINER_CLASSES.
const TOAST_BASE_CLASSES = cn(
  'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-md border p-4 pr-8 shadow-lg',
  'transition-all',
  'data-[swipe=cancel]:translate-x-0',
  'data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
  'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
  'data-[swipe=move]:transition-none',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[swipe=end]:animate-out data-[state=closed]:fade-out-80',
  'data-[state=closed]:slide-out-to-right-full',
  'data-[state=open]:slide-in-from-top-full',
  'data-[state=open]:sm:slide-in-from-bottom-full',
);

type ToastRootProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & {
  variant?: ToastVariant;
};

// `variant` is consumed here (mapped to the semantic container classes) and
// also re-emitted as a data attribute so the inner `ToastProgressBar` and any
// future child can branch on it without prop drilling.
const Toast = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Root>, ToastRootProps>(
  ({ className, variant = ToastVariant.Default, ...props }, ref) => {
    return (
      <ToastPrimitives.Root
        ref={ref}
        data-variant={variant}
        className={cn(TOAST_BASE_CLASSES, TOAST_VARIANT_CONTAINER_CLASSES[variant], className)}
        {...props}
      />
    );
  },
);
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'ring-offset-background hover:bg-secondary focus:ring-ring group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'text-foreground/50 hover:text-foreground absolute top-2 right-2 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 focus:opacity-100 focus:ring-2 focus:outline-none group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600',
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn('text-sm font-semibold', className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-sm opacity-90', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

// Per-variant icon, rendered to the left of the title/description column. We
// branch on the variant map so a new variant added to the enum + constants
// flows here automatically. Default variant renders nothing (keeps neutral
// toasts visually quiet).
type ToastIconProps = {
  variant: ToastVariant;
  className?: string;
};

function ToastIcon({ variant, className }: ToastIconProps): React.ReactElement | null {
  const Icon = TOAST_VARIANT_ICONS[variant];
  if (!Icon) {
    return null;
  }
  return (
    <Icon
      aria-hidden="true"
      className={cn('mt-0.5 h-5 w-5 shrink-0', TOAST_VARIANT_ICON_CLASSES[variant], className)}
    />
  );
}

// Auto-dismiss progress bar. Sits flush against the bottom edge of the toast
// and animates from full width to zero over `durationMs`. We use a CSS
// transition (not an animation) so the bar pauses correctly when the user
// hovers via Radix's built-in pause-on-hover behaviour. The visual cue helps
// users predict the dismiss moment so they can grab the action button before
// it disappears.
type ToastProgressBarProps = {
  variant: ToastVariant;
  durationMs: number;
};

function ToastProgressBar({ variant, durationMs }: ToastProgressBarProps): React.ReactElement {
  // We render at width:100% then schedule a microtask to set width:0% so the
  // CSS transition runs over the full duration. Without the rAF dance the
  // browser would coalesce the two style writes and skip the animation.
  const [width, setWidth] = React.useState<string>('100%');
  React.useEffect(() => {
    const handle = window.requestAnimationFrame(() => {
      setWidth('0%');
    });
    return () => {
      window.cancelAnimationFrame(handle);
    };
  }, []);
  return (
    <div
      aria-hidden="true"
      className="bg-foreground/5 pointer-events-none absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-md"
    >
      <div
        className={cn('h-full origin-left', TOAST_VARIANT_PROGRESS_CLASSES[variant])}
        style={{
          width,
          transitionProperty: 'width',
          transitionDuration: `${durationMs}ms`,
          transitionTimingFunction: 'linear',
        }}
      />
    </div>
  );
}

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  ToastIcon,
  ToastProgressBar,
};
export type { ToastRootProps };
