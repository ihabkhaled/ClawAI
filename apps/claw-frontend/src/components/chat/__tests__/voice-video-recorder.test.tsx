import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VoiceVideoRecorder } from '@/components/chat/voice-video-recorder';

vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined ? key : `${key}:${String(Object.values(params)[0])}`,
  }),
}));

const stoppedTracks: Array<() => void> = [];

class MockMediaRecorder {
  static instances: MockMediaRecorder[] = [];
  state = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public stream: unknown) {
    MockMediaRecorder.instances.push(this);
  }

  start(): void {
    this.state = 'recording';
  }

  stop(): void {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['bytes'], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}

beforeEach(() => {
  MockMediaRecorder.instances = [];
  stoppedTracks.length = 0;
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn(
        async () => ({ getTracks: () => [{ stop: vi.fn() }] }) as unknown as MediaStream,
      ),
    },
  });
  (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = MockMediaRecorder;
});

describe('VoiceVideoRecorder', () => {
  it('dims and disables the microphone when the model cannot take audio', () => {
    render(<VoiceVideoRecorder canSendAudio={false} canSendVideo onRecorded={vi.fn()} />);

    const mic = screen.getByTestId('voice-video-recorder-audio');
    expect(mic).toBeDisabled();
    expect(mic.classList.contains('opacity-50')).toBe(true);
    // The reason is stated, not implied by absence.
    expect(mic).toHaveAttribute('title', 'chat.recorder.audioNotSupportedByModel');
    expect(mic).toHaveAttribute('aria-label', 'chat.recorder.audioNotSupportedByModel');

    // The control is still THERE — dimmed, never hidden.
    expect(screen.getByTestId('voice-video-recorder-video')).toBeEnabled();
  });

  it('dims and disables the camera when the model cannot take video', () => {
    render(<VoiceVideoRecorder canSendAudio canSendVideo={false} onRecorded={vi.fn()} />);

    const camera = screen.getByTestId('voice-video-recorder-video');
    expect(camera).toBeDisabled();
    expect(camera.classList.contains('opacity-50')).toBe(true);
    expect(camera).toHaveAttribute('title', 'chat.recorder.videoNotSupportedByModel');
    expect(screen.getByTestId('voice-video-recorder-audio')).toBeEnabled();
  });

  it('enables both when the capabilities are true, and when they are unknown-defaulted to true', () => {
    render(<VoiceVideoRecorder canSendAudio canSendVideo onRecorded={vi.fn()} />);

    const mic = screen.getByTestId('voice-video-recorder-audio');
    const camera = screen.getByTestId('voice-video-recorder-video');
    expect(mic).toBeEnabled();
    expect(camera).toBeEnabled();
    expect(mic.classList.contains('opacity-50')).toBe(false);
    expect(mic).toHaveAttribute('title', 'chat.recorder.recordVoice');
    expect(camera).toHaveAttribute('title', 'chat.recorder.recordVideo');
  });

  it('disables both while the composer itself is disabled', () => {
    render(<VoiceVideoRecorder canSendAudio canSendVideo onRecorded={vi.fn()} disabled />);
    expect(screen.getByTestId('voice-video-recorder-audio')).toBeDisabled();
    expect(screen.getByTestId('voice-video-recorder-video')).toBeDisabled();
  });

  it('records, shows the elapsed readout, and hands the file to onRecorded on stop', async () => {
    const onRecorded = vi.fn();
    render(<VoiceVideoRecorder canSendAudio canSendVideo onRecorded={onRecorded} />);

    fireEvent.click(screen.getByTestId('voice-video-recorder-audio'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-video-recorder-elapsed')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('voice-video-recorder-stop'));

    await waitFor(() => {
      expect(onRecorded).toHaveBeenCalledTimes(1);
    });
    expect(onRecorded.mock.calls[0]?.[0]).toBeInstanceOf(File);
    // Back to the two triggers once the take is done.
    expect(screen.getByTestId('voice-video-recorder-audio')).toBeInTheDocument();
  });

  it('discards the take on cancel', async () => {
    const onRecorded = vi.fn();
    render(<VoiceVideoRecorder canSendAudio canSendVideo onRecorded={onRecorded} />);

    fireEvent.click(screen.getByTestId('voice-video-recorder-audio'));
    await waitFor(() => {
      expect(screen.getByTestId('voice-video-recorder-cancel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('voice-video-recorder-cancel'));

    await waitFor(() => {
      expect(screen.getByTestId('voice-video-recorder-audio')).toBeInTheDocument();
    });
    expect(onRecorded).not.toHaveBeenCalled();
  });

  it('dims both controls with a browser reason when recording is unsupported', () => {
    Reflect.deleteProperty(globalThis as unknown as Record<string, unknown>, 'MediaRecorder');
    render(<VoiceVideoRecorder canSendAudio canSendVideo onRecorded={vi.fn()} />);

    expect(screen.getByTestId('voice-video-recorder-audio')).toHaveAttribute(
      'title',
      'chat.recorder.unsupportedBrowser',
    );
    expect(screen.getByTestId('voice-video-recorder-video')).toBeDisabled();
  });
});
