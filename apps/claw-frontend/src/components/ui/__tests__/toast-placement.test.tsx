import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Toast, ToastProvider, ToastViewport } from '@/components/ui/toast';
import { TOAST_VARIANT_CONTAINER_CLASSES } from '@/constants/toast.constants';
import { ToastVariant } from '@/enums/toast-variant.enum';

describe('ToastViewport placement', () => {
  // Regression: the viewport used to be `top-0 … sm:bottom-0`, which put toasts
  // at the TOP on mobile — the hardest place to reach and directly under the
  // notch — and only moved them to the bottom on desktop.
  it('anchors to the bottom on mobile', () => {
    render(
      <ToastProvider>
        <ToastViewport data-testid="toast-viewport" />
      </ToastProvider>,
    );

    const viewport = screen.getByTestId('toast-viewport');
    expect(viewport.className).toContain('bottom-0');
    expect(viewport.className).not.toContain('top-0');
  });

  it('clears the mobile bottom nav via the safe-area utility', () => {
    render(
      <ToastProvider>
        <ToastViewport data-testid="toast-viewport" />
      </ToastProvider>,
    );

    const viewport = screen.getByTestId('toast-viewport');
    expect(viewport.className).toContain('safe-bottom');
    expect(viewport.className).toContain('safe-bottom-base-nav');
  });
});

describe('toast variant surfaces', () => {
  // Mobile toasts must be opaque. `toast-surface` paints the tint over an
  // opaque background-color below `sm:`; a bare `bg-<variant>/10` would let the
  // chat transcript show straight through.
  it.each([ToastVariant.Success, ToastVariant.Error, ToastVariant.Warning, ToastVariant.Info])(
    'uses the opaque-capable toast-surface for the %s variant',
    (variant) => {
      const classes = TOAST_VARIANT_CONTAINER_CLASSES[variant];
      expect(classes).toContain('toast-surface');
      expect(classes).toContain('--toast-tint');
      expect(classes).not.toMatch(/bg-\w+\/10/);
    },
  );

  it('leaves the already-opaque variants alone', () => {
    expect(TOAST_VARIANT_CONTAINER_CLASSES[ToastVariant.Default]).toContain('bg-background');
    expect(TOAST_VARIANT_CONTAINER_CLASSES[ToastVariant.Destructive]).toContain('bg-destructive');
  });

  it('applies the variant surface classes to a rendered toast', () => {
    render(
      <ToastProvider>
        <Toast data-testid="toast" variant={ToastVariant.Success} open />
        <ToastViewport />
      </ToastProvider>,
    );

    expect(screen.getByTestId('toast').className).toContain('toast-surface');
  });
});
