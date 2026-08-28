import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Toast, ToastProvider, ToastViewport } from '@/components/ui/toast';
import { TOAST_VARIANT_CONTAINER_CLASSES } from '@/constants/toast.constants';
import { ToastVariant } from '@/enums/toast-variant.enum';

describe('ToastViewport placement', () => {
  // Toasts stack from the TOP edge, by product decision (2026-08-28).
  //
  // This reverses an earlier call. The viewport was moved to the bottom because
  // the top is harder to reach one-handed and sits under the notch; the bottom
  // then turned out to be where everything else already lives — the feedback
  // launcher, the chat FAB, the install prompt, the composer and the mobile nav
  // — so the column had to dodge all of them and landed somewhere different on
  // every page. The notch objection still stands and is answered by `safe-top`
  // rather than by moving back.
  //
  // The offset is a variable, not a literal `top-0`: the header is pinned up
  // there and a trial banner stacks under it, so
  // `useFloatingObstacleClearance` measures the real bands and writes the
  // number. The 0px fallback keeps the column top-anchored before the first
  // measurement and with no JS.
  it('anchors to the top, below whatever is pinned there', () => {
    render(
      <ToastProvider>
        <ToastViewport data-testid="toast-viewport" />
      </ToastProvider>,
    );

    const viewport = screen.getByTestId('toast-viewport');
    expect(viewport.className).toContain('top-[var(--toast-top-clearance,0px)]');
    expect(viewport.className).not.toContain('bottom-0');
    expect(viewport.className).not.toContain('bottom-[var(');
  });

  it('keeps clear of the notch via the safe-area utility', () => {
    // `.safe-top` assigns padding, so it beats a bare `p-*`; it is paired with
    // a base class so the inset and the padding cooperate instead of the inset
    // winning alone and leaving 0px on a device without a notch.
    render(
      <ToastProvider>
        <ToastViewport data-testid="toast-viewport" />
      </ToastProvider>,
    );

    const viewport = screen.getByTestId('toast-viewport');
    expect(viewport.className).toContain('safe-top');
    expect(viewport.className).toContain('safe-top-base-4');
  });

  it('stacks downward from the top rather than upward', () => {
    // `flex-col-reverse` belongs to a bottom-anchored column. Left in place it
    // would put the newest toast furthest from the edge it grows from.
    render(
      <ToastProvider>
        <ToastViewport data-testid="toast-viewport" />
      </ToastProvider>,
    );

    const viewport = screen.getByTestId('toast-viewport');
    expect(viewport.className).toContain('flex-col');
    expect(viewport.className).not.toContain('flex-col-reverse');
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
