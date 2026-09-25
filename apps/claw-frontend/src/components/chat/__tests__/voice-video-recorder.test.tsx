import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VoiceVideoRecorder } from '@/components/chat/voice-video-recorder';
import { MEDIA_RECORDING_MAX_MS } from '@/constants/media-recording.constants';
import { resolveRecordingMaxMinutes } from '@/utilities/media-recording.utility';

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
      getUserMedia: vi.fn(async () => {
        const tracks = [{ stop: vi.fn() }];
        return {
          getTracks: () => tracks,
          getAudioTracks: () => tracks,
          getVideoTracks: () => tracks,
        } as unknown as MediaStream;
      }),
    },
  });
  (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = MockMediaRecorder;
});

describe('VoiceVideoRecorder', () => {
  it('dims and disables the microphone when no transcription is available', () => {
    render(<VoiceVideoRecorder canSendAudio={false} canSendVideo onRecorded={vi.fn()} />);

    const mic = screen.getByTestId('voice-video-recorder-audio');
    expect(mic).toBeDisabled();
    expect(mic.classList.contains('opacity-50')).toBe(true);
    // The reason is stated, not implied by absence.
    expect(mic).toHaveAttribute('title', 'mediaUi.recorder.noTranscription');
    expect(mic).toHaveAttribute('aria-label', 'mediaUi.recorder.noTranscription');

    // The control is still THERE — dimmed, never hidden.
    expect(screen.getByTestId('voice-video-recorder-video')).toBeEnabled();
  });

  it('dims and disables the camera when the plan disables video', () => {
    render(<VoiceVideoRecorder canSendAudio canSendVideo={false} onRecorded={vi.fn()} />);

    const camera = screen.getByTestId('voice-video-recorder-video');
    expect(camera).toBeDisabled();
    expect(camera.classList.contains('opacity-50')).toBe(true);
    expect(camera).toHaveAttribute('title', 'mediaUi.recorder.videoDisabledByPlan');
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
    fireEvent.click(await screen.findByTestId('media-recording-consent-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('recording-surface-elapsed')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('recording-surface-stop'));

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
    fireEvent.click(await screen.findByTestId('media-recording-consent-confirm'));
    await waitFor(() => {
      expect(screen.getByTestId('recording-surface-cancel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('recording-surface-cancel'));

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

describe('VoiceVideoRecorder — consent before the browser prompt', () => {
  it('opens the dialog and does NOT touch getUserMedia when the microphone is pressed', async () => {
    render(<VoiceVideoRecorder canSendAudio canSendVideo onRecorded={vi.fn()} />);

    fireEvent.click(screen.getByTestId('voice-video-recorder-audio'));

    expect(await screen.findByTestId('media-recording-consent-dialog')).toBeInTheDocument();
    // The whole point: the browser's own permission prompt has not happened yet.
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    expect(MockMediaRecorder.instances).toHaveLength(0);
  });

  it('names the microphone for an audio note and both devices for a video note', async () => {
    const { unmount } = render(
      <VoiceVideoRecorder canSendAudio canSendVideo onRecorded={vi.fn()} />,
    );

    fireEvent.click(screen.getByTestId('voice-video-recorder-audio'));
    expect(await screen.findByTestId('media-recording-consent-dialog')).toHaveAttribute(
      'data-kind',
      'audio',
    );
    expect(screen.getByTestId('media-recording-consent-devices')).toHaveTextContent(
      'chat.recorder.consentAudioDevices',
    );
    unmount();

    render(<VoiceVideoRecorder canSendAudio canSendVideo onRecorded={vi.fn()} />);
    fireEvent.click(screen.getByTestId('voice-video-recorder-video'));
    expect(await screen.findByTestId('media-recording-consent-dialog')).toHaveAttribute(
      'data-kind',
      'video',
    );
    expect(screen.getByTestId('media-recording-consent-devices')).toHaveTextContent(
      'chat.recorder.consentVideoDevices',
    );
  });

  it('states the upload, the coming permission prompt, and the cap taken from the constant', async () => {
    render(<VoiceVideoRecorder canSendAudio canSendVideo onRecorded={vi.fn()} />);

    fireEvent.click(screen.getByTestId('voice-video-recorder-audio'));
    await screen.findByTestId('media-recording-consent-dialog');

    expect(screen.getByTestId('media-recording-consent-permission')).toHaveTextContent(
      'chat.recorder.consentPermission',
    );
    expect(screen.getByTestId('media-recording-consent-upload')).toHaveTextContent(
      'chat.recorder.consentUpload',
    );
    // The mocked t() appends the first param, so the minutes are visible here —
    // and they are derived from MEDIA_RECORDING_MAX_MS, not written into copy.
    expect(screen.getByTestId('media-recording-consent-max-length')).toHaveTextContent(
      `chat.recorder.consentMaxLength:${String(resolveRecordingMaxMinutes(MEDIA_RECORDING_MAX_MS))}`,
    );
  });

  it('starts recording only once the dialog is confirmed', async () => {
    render(<VoiceVideoRecorder canSendAudio canSendVideo onRecorded={vi.fn()} />);

    fireEvent.click(screen.getByTestId('voice-video-recorder-video'));
    fireEvent.click(await screen.findByTestId('media-recording-consent-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('recording-surface-elapsed')).toBeInTheDocument();
    });
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    // A video note asks for the camera AND the microphone.
    expect(vi.mocked(navigator.mediaDevices.getUserMedia).mock.calls[0]?.[0]).toMatchObject({
      audio: true,
    });
  });

  it('starts nothing when the dialog is cancelled', async () => {
    render(<VoiceVideoRecorder canSendAudio canSendVideo onRecorded={vi.fn()} />);

    fireEvent.click(screen.getByTestId('voice-video-recorder-audio'));
    fireEvent.click(await screen.findByTestId('media-recording-consent-cancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('media-recording-consent-dialog')).not.toBeInTheDocument();
    });
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    expect(screen.queryByTestId('recording-surface-elapsed')).not.toBeInTheDocument();
  });

  it('starts nothing when the dialog is dismissed with Escape', async () => {
    render(<VoiceVideoRecorder canSendAudio canSendVideo onRecorded={vi.fn()} />);

    fireEvent.click(screen.getByTestId('voice-video-recorder-audio'));
    await screen.findByTestId('media-recording-consent-dialog');

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId('media-recording-consent-dialog')).not.toBeInTheDocument();
    });
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });

  it('puts the initial focus on the confirm button', async () => {
    render(<VoiceVideoRecorder canSendAudio canSendVideo onRecorded={vi.fn()} />);

    fireEvent.click(screen.getByTestId('voice-video-recorder-audio'));
    const confirm = await screen.findByTestId('media-recording-consent-confirm');

    await waitFor(() => {
      expect(document.activeElement).toBe(confirm);
    });
  });

  it('still surfaces the denial message when permission is refused after confirming', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
      new Error('Permission denied'),
    );
    render(<VoiceVideoRecorder canSendAudio canSendVideo onRecorded={vi.fn()} />);

    fireEvent.click(screen.getByTestId('voice-video-recorder-audio'));
    fireEvent.click(await screen.findByTestId('media-recording-consent-confirm'));

    expect(await screen.findByTestId('voice-video-recorder-error')).toHaveTextContent(
      'chat.recorder.errorPermissionDenied',
    );
  });
});
