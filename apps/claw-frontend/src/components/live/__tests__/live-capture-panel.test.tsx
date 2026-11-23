import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LiveCapturePanel } from '@/components/live/live-capture-panel';
import { LiveCaptureError, LiveCaptureSource, LiveCaptureState } from '@/enums/live.enum';
import { LIVE_TRANSLATIONS } from '@/lib/i18n/locales/live-translations';
import type { UseLiveCaptureResult } from '@/types/live.types';

/** The real English dictionary, so a wrong key shows as a raw key. */
function t(key: string): string {
  let node: unknown = { live: LIVE_TRANSLATIONS.en };
  for (const part of key.split('.')) {
    node =
      typeof node === 'object' && node !== null
        ? (node as Record<string, unknown>)[part]
        : undefined;
  }
  return typeof node === 'string' ? node : key;
}

function capture(overrides: Partial<UseLiveCaptureResult>): UseLiveCaptureResult {
  return {
    source: LiveCaptureSource.TAB,
    state: LiveCaptureState.IDLE,
    error: null,
    isCapturing: false,
    consentOpen: false,
    openConsent: vi.fn(),
    closeConsent: vi.fn(),
    confirm: vi.fn(),
    stop: vi.fn(),
    ...overrides,
  };
}

describe('LiveCapturePanel', () => {
  it('offers tab sharing on a desktop browser, with no microphone hint', () => {
    render(<LiveCapturePanel capture={capture({})} t={t} />);
    expect(screen.getByRole('button', { name: 'Analyze with my browser' })).toBeInTheDocument();
    expect(screen.queryByText(/phone near its speaker/u)).not.toBeInTheDocument();
  });

  it('offers the microphone on a phone, with the keep-the-sound-on hint', () => {
    render(<LiveCapturePanel capture={capture({ source: LiveCaptureSource.MICROPHONE })} t={t} />);
    expect(screen.getByRole('button', { name: 'Analyze using microphone' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Keep the stream’s sound on and the phone near its speaker. Room noise is heard too.',
      ),
    ).toBeInTheDocument();
  });

  it('says it is listening through the microphone while capturing', () => {
    render(
      <LiveCapturePanel
        capture={capture({
          source: LiveCaptureSource.MICROPHONE,
          state: LiveCaptureState.CAPTURING,
          isCapturing: true,
        })}
        t={t}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Analyzing the sound through your microphone',
    );
  });

  it('asks microphone-specific consent', () => {
    render(
      <LiveCapturePanel
        capture={capture({ source: LiveCaptureSource.MICROPHONE, consentOpen: true })}
        t={t}
      />,
    );
    expect(screen.getByText('Analyze this stream using your microphone')).toBeInTheDocument();
    expect(
      screen.getByText('Your microphone’s audio is sent for transcription.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Nothing else is recorded or sent from your device.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use microphone' })).toBeInTheDocument();
    expect(screen.queryByText(/Also share tab audio/u)).not.toBeInTheDocument();
  });

  it('explains that the browser cannot capture audio at all', () => {
    render(
      <LiveCapturePanel
        capture={capture({
          source: null,
          state: LiveCaptureState.ERROR,
          error: LiveCaptureError.UNSUPPORTED,
        })}
        t={t}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This browser can’t capture audio. Try Chrome, Edge, Safari or Firefox.',
    );
  });
});

describe('LiveCapturePanel microphone refused', () => {
  it('tells the viewer how to unblock the microphone', () => {
    render(
      <LiveCapturePanel
        capture={capture({
          source: LiveCaptureSource.MICROPHONE,
          state: LiveCaptureState.ERROR,
          error: LiveCaptureError.MIC_DENIED,
        })}
        t={t}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Microphone access is blocked. Allow it in your browser’s site settings, then try again.',
    );
  });
});
