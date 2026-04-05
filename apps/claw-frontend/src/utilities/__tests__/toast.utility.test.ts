import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    it('calls toast with default title "Success" when no title provided', () => {
      showToast.success({ description: 'Done!' });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Done!',
        variant: 'default',
      });
    });

    it('uses custom title when provided', () => {
      showToast.success({ title: 'Saved', description: 'Record saved' });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Saved',
        description: 'Record saved',
        variant: 'default',
      });
    });
  });

  // ---------- error ----------

  describe('error', () => {
    it('calls toast with destructive variant', () => {
      showToast.error({ description: 'Something failed' });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Something failed',
        variant: 'destructive',
      });
    });

    it('uses custom title when provided', () => {
      showToast.error({ title: 'Oops', description: 'Nope' });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Oops',
        description: 'Nope',
        variant: 'destructive',
      });
    });
  });

  // ---------- apiError ----------

  describe('apiError', () => {
    it('shows fallback message when error is not an object', () => {
      showToast.apiError(null, 'Fallback message');

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Fallback message',
        variant: 'destructive',
      });
    });

    it('shows default fallback when no fallback provided and error has no message', () => {
      showToast.apiError(undefined);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    });

    it('extracts message from ApiClientError-shaped object', () => {
      const err = { message: 'Invalid credentials', status: 401 };
      showToast.apiError(err);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Invalid credentials',
        variant: 'destructive',
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
        variant: 'destructive',
      });
    });
  });

  // ---------- info ----------

  describe('info', () => {
    it('calls toast with default variant and Info title', () => {
      showToast.info({ description: 'FYI' });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Info',
        description: 'FYI',
        variant: 'default',
      });
    });
  });

  // ---------- warning ----------

  describe('warning', () => {
    it('calls toast with destructive variant and Warning title', () => {
      showToast.warning({ description: 'Careful!' });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Warning',
        description: 'Careful!',
        variant: 'destructive',
      });
    });
  });
});
