import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MEDIA_RECORDING_MAX_MS } from '@/constants/media-recording.constants';
import { MediaRecordingError } from '@/enums/media-recording-error.enum';
import { MediaRecordingKind } from '@/enums/media-recording-kind.enum';
import { useMediaRecorder } from '@/hooks/files/use-media-recorder';

vi.mock('@/utilities', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

type RecorderHandlers = {
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  onerror: (() => void) | null;
};

const stoppedTracks: string[] = [];

class MockMediaRecorder implements RecorderHandlers {
  static instances: MockMediaRecorder[] = [];
  static constructShouldThrow = false;

  state = 'inactive';
  mimeType = 'audio/webm;codecs=opus';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public stream: unknown) {
    if (MockMediaRecorder.constructShouldThrow) {
      throw new Error('no codec');
    }
    MockMediaRecorder.instances.push(this);
  }

  start(): void {
    this.state = 'recording';
  }

  stop(): void {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['audio-bytes'], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}

function makeStream(label: string): MediaStream {
  return {
    getTracks: () => [
      {
        stop: (): void => {
          stoppedTracks.push(label);
        },
      },
    ],
  } as unknown as MediaStream;
}

let getUserMedia: ReturnType<typeof vi.fn>;

function installBrowser(): void {
  getUserMedia = vi.fn(async () => makeStream('track'));
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = MockMediaRecorder;
}

beforeEach(() => {
  MockMediaRecorder.instances = [];
  MockMediaRecorder.constructShouldThrow = false;
  stoppedTracks.length = 0;
  installBrowser();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useMediaRecorder', () => {
  it('start then stop hands the caller a real File with the recorder mime type', async () => {
    const onRecorded = vi.fn();
    const { result } = renderHook(() => useMediaRecorder({ onRecorded }));

    expect(result.current.isSupported).toBe(true);

    await act(async () => {
      await result.current.start(MediaRecordingKind.Audio);
    });
    expect(result.current.isRecording).toBe(true);
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });

    act(() => {
      result.current.stop();
    });

    expect(onRecorded).toHaveBeenCalledTimes(1);
    const file = onRecorded.mock.calls[0]?.[0] as File;
    expect(file).toBeInstanceOf(File);
    // The codec parameter is stripped: file-service matches the declared mime
    // against an exact allowlist that has no `audio/webm;codecs=opus` key.
    expect(file.type).toBe('audio/webm');
    expect(file.name).toMatch(/^voice-note-.*\.webm$/);
    expect(file.size).toBeGreaterThan(0);
    expect(result.current.isRecording).toBe(false);
  });

  it('asks for the camera too when recording a video note', async () => {
    const onRecorded = vi.fn();
    const { result } = renderHook(() => useMediaRecorder({ onRecorded }));

    await act(async () => {
      await result.current.start(MediaRecordingKind.Video);
    });

    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: true, video: expect.anything() }),
    );
  });

  it('stops itself at the hard length cap and keeps what it captured', async () => {
    vi.useFakeTimers();
    const onRecorded = vi.fn();
    const { result } = renderHook(() => useMediaRecorder({ onRecorded }));

    await act(async () => {
      await result.current.start(MediaRecordingKind.Audio);
    });
    expect(result.current.isRecording).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MEDIA_RECORDING_MAX_MS);
    });

    expect(result.current.isRecording).toBe(false);
    expect(onRecorded).toHaveBeenCalledTimes(1);
    expect(stoppedTracks).toEqual(['track']);
  });

  it('releases every track on stop', async () => {
    const { result } = renderHook(() => useMediaRecorder({ onRecorded: vi.fn() }));
    await act(async () => {
      await result.current.start(MediaRecordingKind.Audio);
    });
    expect(stoppedTracks).toEqual([]);

    act(() => {
      result.current.stop();
    });
    expect(stoppedTracks).toEqual(['track']);
  });

  it('cancel releases the tracks and emits nothing', async () => {
    const onRecorded = vi.fn();
    const { result } = renderHook(() => useMediaRecorder({ onRecorded }));
    await act(async () => {
      await result.current.start(MediaRecordingKind.Audio);
    });

    act(() => {
      result.current.cancel();
    });

    expect(onRecorded).not.toHaveBeenCalled();
    expect(stoppedTracks).toEqual(['track']);
    expect(result.current.isRecording).toBe(false);
  });

  it('releases the microphone when the component unmounts mid-recording', async () => {
    const onRecorded = vi.fn();
    const { result, unmount } = renderHook(() => useMediaRecorder({ onRecorded }));
    await act(async () => {
      await result.current.start(MediaRecordingKind.Audio);
    });
    expect(stoppedTracks).toEqual([]);

    unmount();

    expect(stoppedTracks).toEqual(['track']);
    expect(onRecorded).not.toHaveBeenCalled();
  });

  it('surfaces an error, not a silent no-op, when the browser has no MediaRecorder', async () => {
    Reflect.deleteProperty(globalThis as unknown as Record<string, unknown>, 'MediaRecorder');
    const { result } = renderHook(() => useMediaRecorder({ onRecorded: vi.fn() }));

    expect(result.current.isSupported).toBe(false);

    await act(async () => {
      await result.current.start(MediaRecordingKind.Audio);
    });

    expect(result.current.error).toBe(MediaRecordingError.Unsupported);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('surfaces a denied permission', async () => {
    getUserMedia.mockRejectedValueOnce(new Error('NotAllowedError'));
    const { result } = renderHook(() => useMediaRecorder({ onRecorded: vi.fn() }));

    await act(async () => {
      await result.current.start(MediaRecordingKind.Audio);
    });

    await waitFor(() => {
      expect(result.current.error).toBe(MediaRecordingError.PermissionDenied);
    });
    expect(result.current.isRecording).toBe(false);
  });

  it('releases the stream and reports unsupported when MediaRecorder cannot be constructed', async () => {
    MockMediaRecorder.constructShouldThrow = true;
    const { result } = renderHook(() => useMediaRecorder({ onRecorded: vi.fn() }));

    await act(async () => {
      await result.current.start(MediaRecordingKind.Audio);
    });

    expect(result.current.error).toBe(MediaRecordingError.Unsupported);
    expect(stoppedTracks).toEqual(['track']);
  });
});
