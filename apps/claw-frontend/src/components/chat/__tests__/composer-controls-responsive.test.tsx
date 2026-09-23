import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MediaRecordingConsentDialog } from '@/components/chat/media-recording-consent-dialog';
import { VoiceVideoRecorder } from '@/components/chat/voice-video-recorder';
import { MediaRecordingKind } from '@/enums/media-recording-kind.enum';

/**
 * The composer controls have to survive a 320px phone.
 *
 * This asserts on CLASSES rather than measured pixels because jsdom does not
 * lay out, and because the 2026-08-22 mobile regression came from guards
 * written as `max-md:` — a WIDTH test. A phone in landscape reports 915x412,
 * clears 768px, and is handed desktop sizing. Every guard here has to be
 * pointer-based (`touch:`) for the same reason
 * `ui/__tests__/touch-target-guards.test.tsx` says so.
 *
 * Verified live alongside these at 320, 375, 768 and 1440 on
 * https://claw.local/en/chat/compare: no page overflow at any width, the
 * consent dialog 304px wide inside a 320px viewport, and its actions 44px tall.
 */
vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined ? key : `${key}:${String(Object.values(params)[0])}`,
  }),
}));

describe('composer controls fit a small screen', () => {
  it('gives the recorder triggers a coarse-pointer hit area', () => {
    render(<VoiceVideoRecorder canSendAudio canSendVideo disabled={false} onRecorded={vi.fn()} />);

    for (const button of screen.getAllByRole('button')) {
      expect(button.className).toContain('touch:min-h-11');
      expect(button.className).not.toContain('max-md:');
    }
  });

  it('keeps the consent dialog inside the viewport instead of a fixed width', () => {
    // `sm:max-w-md` caps it on a laptop; below that breakpoint the Dialog
    // primitive's own `w-[calc(100vw-1rem)]` is what keeps it on screen. A
    // plain `w-96` here would overflow a 320px phone by 64px.
    render(
      <MediaRecordingConsentDialog
        kind={MediaRecordingKind.Audio}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onOpenChange={vi.fn()}
        confirmRef={{ current: null }}
        onOpenAutoFocus={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('sm:max-w-md');
    expect(dialog.className).not.toMatch(/\bw-\[\d+px\]/u);
  });

  it('gives the dialog actions a coarse-pointer hit area too', () => {
    render(
      <MediaRecordingConsentDialog
        kind={MediaRecordingKind.Video}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onOpenChange={vi.fn()}
        confirmRef={{ current: null }}
        onOpenAutoFocus={vi.fn()}
      />,
    );

    for (const button of screen.getAllByRole('button')) {
      expect(button.className).not.toContain('max-md:');
    }
  });
});
