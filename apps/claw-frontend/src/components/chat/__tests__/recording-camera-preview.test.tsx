import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RecordingCameraPreview } from '@/components/chat/recording-camera-preview';

vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('RecordingCameraPreview', () => {
  it('binds the live stream to the video element srcObject', () => {
    const stream = { id: 'stream-1' } as unknown as MediaStream;
    render(<RecordingCameraPreview stream={stream} />);

    const video = screen.getByTestId('recording-camera-preview') as HTMLVideoElement;
    expect(video.srcObject).toBe(stream);
  });

  it('clears srcObject when the stream goes away (track released elsewhere)', () => {
    const stream = { id: 'stream-1' } as unknown as MediaStream;
    const { rerender } = render(<RecordingCameraPreview stream={stream} />);
    const video = screen.getByTestId('recording-camera-preview') as HTMLVideoElement;
    expect(video.srcObject).toBe(stream);

    rerender(<RecordingCameraPreview stream={null} />);
    expect(video.srcObject).toBeNull();
  });

  it('is muted — a preview, never a monitor that echoes the mic', () => {
    render(<RecordingCameraPreview stream={null} />);
    expect(screen.getByTestId('recording-camera-preview')).toHaveProperty('muted', true);
  });
});
