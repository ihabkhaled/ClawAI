import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastVariant } from '@/enums/toast-variant.enum';
import { showToast } from '@/utilities/toast.utility';

const mockToast = vi.fn();

vi.mock('@/components/ui/use-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

describe('showToast', () => {
  beforeEach(() => {
    mockToast.mockClear();
  });

  // ---------- success ----------

  describe('success', () => {
    it('calls toast with success variant and default title', () => {
      showToast.success({ description: 'Done!' });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Done!',
        variant: ToastVariant.Success,
        action: undefined,
        durationMs: undefined,
      });
    });

    it('uses custom title when provided', () => {
      showToast.success({ title: 'Saved', description: 'Record saved' });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Saved',
        description: 'Record saved',
        variant: ToastVariant.Success,
        action: undefined,
        durationMs: undefined,
      });
    });

    it('forwards optional action and durationMs', () => {
      const onClick = vi.fn();
      showToast.success({
        description: 'Saved',
        action: { label: 'Undo', onClick },
        durationMs: 8000,
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Saved',
        variant: ToastVariant.Success,
        action: { label: 'Undo', onClick },
        durationMs: 8000,
      });
    });
  });

  // ---------- error ----------

  describe('error', () => {
    it('calls toast with error variant', () => {
      showToast.error({ description: 'Something failed' });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Something failed',
        variant: ToastVariant.Error,
        action: undefined,
        durationMs: undefined,
      });
    });

    it('uses custom title when provided', () => {
      showToast.error({ title: 'Oops', description: 'Nope' });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Oops',
        description: 'Nope',
        variant: ToastVariant.Error,
        action: undefined,
        durationMs: undefined,
      });
    });

    it('forwards a Retry action', () => {
      const onClick = vi.fn();
      showToast.error({
        description: 'Network failed',
        action: { label: 'Retry', onClick },
      });

      const call = mockToast.mock.calls[0] as [{ action: { label: string } }];
      expect(call[0].action?.label).toBe('Retry');
    });
  });

  // ---------- apiError ----------

  describe('apiError', () => {
    it('shows fallback message when error is not an object', () => {
      showToast.apiError(null, 'Fallback message');

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Fallback message',
        variant: ToastVariant.Error,
        action: undefined,
        durationMs: undefined,
      });
    });

    it('shows default fallback when no fallback provided and error has no message', () => {
      showToast.apiError(undefined);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: ToastVariant.Error,
        action: undefined,
        durationMs: undefined,
      });
    });

    it('extracts message from ApiClientError-shaped object', () => {
      const err = { message: 'Invalid credentials', status: 401 };
      showToast.apiError(err);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Invalid credentials',
        variant: ToastVariant.Error,
        action: undefined,
        durationMs: undefined,
      });
    });

    it('appends field-level validation errors', () => {
      const err = {
        message: 'Validation failed',
        status: 422,
        errors: {
          email: ['must be valid'],
          password: ['too short', 'missing number'],
        },
      };
      showToast.apiError(err);

      const call = mockToast.mock.calls[0] as [{ description: string }];
      expect(call[0].description).toContain('Validation failed');
      expect(call[0].description).toContain('email: must be valid');
      expect(call[0].description).toContain('password: too short, missing number');
    });

    it('uses fallback when error message is empty string', () => {
      const err = { message: '', status: 400 };
      showToast.apiError(err, 'Custom fallback');

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Custom fallback',
        variant: ToastVariant.Error,
        action: undefined,
        durationMs: undefined,
      });
    });

    it('forwards an optional action passed via options', () => {
      const onClick = vi.fn();
      showToast.apiError(new Error('boom'), 'Network failed', {
        action: { label: 'Retry', onClick },
      });

      const call = mockToast.mock.calls[0] as [{ action: { label: string } }];
      expect(call[0].action?.label).toBe('Retry');
    });
  });

  // ---------- info ----------

  describe('info', () => {
    it('calls toast with info variant and Info title', () => {
      showToast.info({ description: 'FYI' });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Info',
        description: 'FYI',
        variant: ToastVariant.Info,
        action: undefined,
        durationMs: undefined,
      });
    });
  });

  // ---------- warning ----------

  describe('warning', () => {
    it('calls toast with warning variant and Warning title', () => {
      showToast.warning({ description: 'Careful!' });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Warning',
        description: 'Careful!',
        variant: ToastVariant.Warning,
        action: undefined,
        durationMs: undefined,
      });
    });
  });
});
