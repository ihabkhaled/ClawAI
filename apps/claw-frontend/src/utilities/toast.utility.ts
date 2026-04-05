import { toast } from '@/components/ui/use-toast';
import type { ApiClientError } from '@/services/shared/api-client';

type ToastOptions = {
  title?: string;
  description?: string;
};

function success(options: ToastOptions): void {
  toast({
    title: options.title ?? 'Success',
    description: options.description,
    variant: 'default',
  });
}

function error(options: ToastOptions): void {
  toast({
    title: options.title ?? 'Error',
    description: options.description,
    variant: 'destructive',
  });
}

/**
 * Extract a user-friendly message from an API error and show a destructive toast.
 */
function apiError(err: unknown, fallbackMessage?: string): void {
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
    title: 'Error',
    description: message,
    variant: 'destructive',
  });
}

function info(options: ToastOptions): void {
  toast({
    title: options.title ?? 'Info',
    description: options.description,
    variant: 'default',
  });
}

function warning(options: ToastOptions): void {
  toast({
    title: options.title ?? 'Warning',
    description: options.description,
    variant: 'destructive',
  });
}

export const showToast = {
  success,
  error,
  info,
  warning,
  apiError,
};
