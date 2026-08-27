import { toast } from '@/components/ui/use-toast';
import type { ToastAction } from '@/components/ui/use-toast';
import { ToastVariant } from '@/enums/toast-variant.enum';
import type { ApiClientError } from '@/services/shared/api-client';
import type { TranslateFunction } from '@/types';

import { formatApiFieldErrors } from './api-error-fields.utility';
import { resolveApiErrorMessage } from './api-error-message.utility';

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
  /**
   * Pass `t` to translate known backend error codes.
   *
   * Without it `apiError` prints `apiErr.message` verbatim — the backend's
   * English — which is how a machine-readable refusal reached users untranslated
   * even though an error-code map already existed. Callers that have `t` in
   * scope should always pass it.
   */
  translate?: TranslateFunction;
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

  if (options?.translate) {
    message = resolveApiErrorMessage(err, options.translate, message);
  } else if (err && typeof err === 'object' && 'message' in err) {
    const apiErr = err as ApiClientError;
    message = apiErr.message || message;
  }

  // Field-level validation detail is appended either way — it is already
  // per-field and carries no backend prose.
  if (err && typeof err === 'object' && 'errors' in err) {
    const fieldErrors = formatApiFieldErrors((err as ApiClientError).errors);
    if (fieldErrors) {
      message = `${message} (${fieldErrors})`;
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
