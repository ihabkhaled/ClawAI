import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RecordingSurface } from '@/components/chat/recording-surface';
import { MediaRecordingKind } from '@/enums/media-recording-kind.enum';

/**
 * The recorder used to be a plain `fixed inset-0` `<div>` mounted inline in
 * the composer's toolbar row. On a real phone that "fixed" positioning was
 * relative to a transformed ANCESTOR (the composer's own enter/exit
 * animation), not the viewport — the timer and waveform got squeezed into
 * the composer's box and collided with the browser chrome and the bottom
 * nav. This asserts the surface is now a proper centered modal: portalled to
 * `document.body` (outside every such ancestor), backed by a dismissible
 * backdrop, and sized to stay inside a 320px viewport without a `max-md:`
 * width guard (the same class of bug `composer-controls-responsive.test.tsx`
 * exists to catch).
 */
vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined ? key : `${key}:${String(Object.values(params)[0])}`,
  }),
}));

function renderSurface(overrides: Partial<Parameters<typeof RecordingSurface>[0]> = {}) {
  const onStop = vi.fn();
  const onSend = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    <RecordingSurface
      kind={MediaRecordingKind.Audio}
      stream={null}
      elapsedMs={26_000}
      onStop={onStop}
      onSend={onSend}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { ...utils, onStop, onSend, onCancel };
}

describe('RecordingSurface — centered modal', () => {
  it('portals the dialog to document.body instead of the composer flow', () => {
    const { container } = renderSurface();

    const surface = screen.getByTestId('recording-surface');
    // Rendered outside the caller's own render container — a real portal,
    // not an element left in normal document flow inside the composer tree.
    expect(container.contains(surface)).toBe(false);
    expect(document.body.contains(surface)).toBe(true);
  });

  it('renders a full-screen backdrop dimming everything behind the modal', () => {
    renderSurface();

    const backdrop = screen.getByTestId('recording-surface-backdrop');
    expect(backdrop).toBeInTheDocument();
    expect(backdrop.className).toContain('fixed');
    expect(backdrop.className).toContain('inset-0');
  });

  it('routes dismissal (Escape / outside interaction) to onCancel, same as the visible cancel button', () => {
    // Radix's DismissableLayer drives Escape and outside-pointer dismissal
    // through the SAME onOpenChange(false) callback — this proves our
    // wiring (onOpenChange -> onCancel) without re-testing Radix's own
    // outside-click detection, which jsdom's PointerEvent support does not
    // reliably simulate.
    const { onCancel } = renderSurface();

    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('sizes the dialog to stay inside a 320px viewport, with no max-md: width guard', () => {
    renderSurface();

    const surface = screen.getByTestId('recording-surface');
    expect(surface.className).toContain('w-[calc(100vw-1rem)]');
    expect(surface.className).not.toMatch(/\bw-\[\d+px\]/u);
    expect(surface.className).not.toContain('max-md:');
  });

  it('keeps every action button at a coarse-pointer 44px hit area', () => {
    renderSurface();

    for (const testId of [
      'recording-surface-cancel',
      'recording-surface-stop',
      'recording-surface-send',
    ]) {
      const button = screen.getByTestId(testId);
      expect(button.className).toContain('touch:min-h-11');
      expect(button.className).toContain('touch:min-w-11');
      expect(button.className).not.toContain('max-md:');
    }
  });

  it('still renders the live camera preview for a video note inside the modal', () => {
    renderSurface({ kind: MediaRecordingKind.Video });

    expect(screen.getByTestId('recording-camera-preview')).toBeInTheDocument();
    expect(screen.getByTestId('recording-surface')).toHaveAttribute('data-kind', 'video');
  });

  it('unmounts cleanly, removing the portalled node (no leaked overlay on exit)', () => {
    const { unmount } = renderSurface();

    expect(screen.getByTestId('recording-surface')).toBeInTheDocument();
    unmount();

    expect(screen.queryByTestId('recording-surface')).not.toBeInTheDocument();
    expect(screen.queryByTestId('recording-surface-backdrop')).not.toBeInTheDocument();
  });
});
