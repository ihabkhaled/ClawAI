import { toast } from '@/components/ui/use-toast';
import type { ToastAction } from '@/components/ui/use-toast';
import { ToastVariant } from '@/enums/toast-variant.enum';
import type { ApiClientError } from '@/services/shared/api-client';

type ToastOptions = {
  title?: string;
  description?: string;
  /**
   * Optional Undo / Retry / View affordance. The toaster renders a button next
   * to the title; clicking it invokes `action.onClick` and dismisses the
   * toast. We forward whatever the caller passes verbatim — variant-specific
   * styling (destructive vs. success outline) is handled inside the toast
   * primitive.
   */
  action?: ToastAction;
  /**
   * Override the per-variant default duration. Pass `0` to disable
   * auto-dismiss entirely (the toast then waits for explicit user dismissal).
   */
  durationMs?: number;
};

function success(options: ToastOptions): void {
  toast({
    title: options.title ?? 'Success',
    description: options.description,
    variant: ToastVariant.Success,
    action: options.action,
    durationMs: options.durationMs,
  });
}

function error(options: ToastOptions): void {
  toast({
    title: options.title ?? 'Error',
    description: options.description,
    variant: ToastVariant.Error,
    action: options.action,
    durationMs: options.durationMs,
  });
}

/**
 * Extract a user-friendly message from an API error and show an error toast.
 */
function apiError(err: unknown, fallbackMessage?: string, options?: ToastOptions): void {
  let message = fallbackMessage ?? 'An unexpected error occurred';

  if (err && typeof err === 'object' && 'message' in err) {
    const apiErr = err as ApiClientError;
    message = apiErr.message || message;

    // If there are field-level validation errors, append them
    if (apiErr.errors) {
      const fieldErrors = Object.entries(apiErr.errors)
        .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
        .join('; ');
      if (fieldErrors) {
        message = `${message} (${fieldErrors})`;
      }
    }
  }

  toast({
    title: options?.title ?? 'Error',
    description: message,
    variant: ToastVariant.Error,
    action: options?.action,
    durationMs: options?.durationMs,
  });
}

function info(options: ToastOptions): void {
  toast({
    title: options.title ?? 'Info',
    description: options.description,
    variant: ToastVariant.Info,
    action: options.action,
    durationMs: options.durationMs,
  });
}

function warning(options: ToastOptions): void {
  toast({
    title: options.title ?? 'Warning',
    description: options.description,
    variant: ToastVariant.Warning,
    action: options.action,
    durationMs: options.durationMs,
  });
}

export const showToast = {
  success,
  error,
  info,
  warning,
  apiError,
};
