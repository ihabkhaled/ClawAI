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

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'safe-bottom safe-bottom-base-nav fixed bottom-0 z-[100] flex max-h-[calc(100dvh-var(--mobile-bottom-nav-height))] w-full flex-col-reverse gap-2 px-3 sm:right-0 sm:bottom-0 sm:px-4 md:max-w-[420px]',
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const TOAST_BASE_CLASSES = cn(
  'group pointer-events-auto relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 overflow-hidden rounded-md border p-4 pe-12 shadow-lg',
  'transition-all',
  'data-[swipe=cancel]:translate-x-0',
  'data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
  'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
  'data-[swipe=move]:transition-none',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[swipe=end]:animate-out data-[state=closed]:fade-out-80',
  'data-[state=closed]:slide-out-to-right-full',
  'data-[state=open]:slide-in-from-bottom-full',
  'max-sm:grid-cols-[auto_minmax(0,1fr)]',
);

type ToastRootProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & {
  variant?: ToastVariant;
};

const Toast = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Root>, ToastRootProps>(
  ({ className, variant = ToastVariant.Default, ...props }, ref) => (
    <ToastPrimitives.Root
      ref={ref}
      data-variant={variant}
      className={cn(TOAST_BASE_CLASSES, TOAST_VARIANT_CONTAINER_CLASSES[variant], className)}
      {...props}
    />
  ),
);
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'ring-offset-background hover:bg-secondary focus:ring-ring group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none disabled:opacity-50 max-sm:col-start-2 max-sm:mt-1 max-sm:min-h-11 max-sm:justify-self-start',
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
      'text-foreground/60 hover:text-foreground absolute top-1 end-1 flex min-h-11 min-w-11 items-center justify-center rounded-md opacity-100 transition-opacity focus:ring-2 focus:outline-none md:top-2 md:end-2 md:min-h-0 md:min-w-0 md:p-1 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100',
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
  <ToastPrimitives.Description ref={ref} className={cn('text-sm opacity-90 break-words', className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastIconProps = { variant: ToastVariant; className?: string };

function ToastIcon({ variant, className }: ToastIconProps): React.ReactElement | null {
  const Icon = TOAST_VARIANT_ICONS[variant];
  if (!Icon) return null;
  return <Icon aria-hidden="true" className={cn('mt-0.5 h-5 w-5 shrink-0', TOAST_VARIANT_ICON_CLASSES[variant], className)} />;
}

type ToastProgressBarProps = { variant: ToastVariant; durationMs: number };

function ToastProgressBar({ variant, durationMs }: ToastProgressBarProps): React.ReactElement {
  const [width, setWidth] = React.useState<string>('100%');
  React.useEffect(() => {
    const handle = window.requestAnimationFrame(() => setWidth('0%'));
    return () => window.cancelAnimationFrame(handle);
  }, []);
  return (
    <div aria-hidden="true" className="bg-foreground/5 pointer-events-none absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-md">
      <div
        className={cn('h-full origin-left', TOAST_VARIANT_PROGRESS_CLASSES[variant])}
        style={{ width, transitionProperty: 'width', transitionDuration: `${durationMs}ms`, transitionTimingFunction: 'linear' }}
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
