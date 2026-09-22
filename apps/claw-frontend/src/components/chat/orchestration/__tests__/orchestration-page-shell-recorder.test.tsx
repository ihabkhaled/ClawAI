import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Sparkles } from 'lucide-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrchestrationPageShell } from '@/components/chat/orchestration/orchestration-page-shell';
import type { OrchestrationPageShellProps } from '@/types/orchestration.types';

// The shell's other children pull react-query and the file catalog; this test is
// about one wire: a recorded note reaching the composer's ingestFiles.
vi.mock('@/components/chat/file-attachment-picker', () => ({
  FileAttachmentPicker: () => <div data-testid="picker" />,
}));
vi.mock('@/components/chat/composer-dropzone', () => ({
  ComposerDropzone: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/chat/orchestration/orchestration-single-model-select', () => ({
  OrchestrationSingleModelSelect: () => <div data-testid="model-select" />,
}));
vi.mock('@/hooks/chat/use-model-media-capabilities', () => ({
  useModelMediaCapabilities: () => ({ canSendAudio: true, canSendVideo: true }),
}));
vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

class MockMediaRecorder {
  state = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public stream: unknown) {}
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

function renderShell(ingestFiles: (files: File[] | FileList) => void): void {
  const props: OrchestrationPageShellProps = {
    headerIcon: Sparkles,
    headerTitle: 'Lab',
    headerDescription: 'Lab description',
    selectedModel: null,
    onModelChange: vi.fn(),
    composer: {
      selectedFileIds: [],
      setSelectedFileIds: vi.fn(),
      ingestFiles,
      isUploading: false,
      pendingCount: 0,
      clear: vi.fn(),
    },
    prompt: '',
    onPromptChange: vi.fn(),
    onSubmit: vi.fn(),
    submitLabel: 'Run',
    isPending: false,
    hasProgress: false,
    stages: [],
    t: (key: string) => key,
  };
  render(<OrchestrationPageShell {...props} />);
}

describe('OrchestrationPageShell — voice/video notes', () => {
  it('renders the recorder beside the attachment picker for every lab page', () => {
    renderShell(vi.fn());
    expect(screen.getByTestId('orchestration-attachments')).toBeInTheDocument();
    expect(screen.getByTestId('voice-video-recorder-audio')).toBeInTheDocument();
    expect(screen.getByTestId('voice-video-recorder-video')).toBeInTheDocument();
  });

  it('sends a finished recording through the composer ingestFiles pipeline', async () => {
    const ingestFiles = vi.fn();
    renderShell(ingestFiles);

    fireEvent.click(screen.getByTestId('voice-video-recorder-audio'));
    await waitFor(() => {
      expect(screen.getByTestId('voice-video-recorder-stop')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('voice-video-recorder-stop'));

    await waitFor(() => {
      expect(ingestFiles).toHaveBeenCalledTimes(1);
    });
    const [files] = ingestFiles.mock.calls[0] as [File[]];
    expect(files).toHaveLength(1);
    expect(files[0]).toBeInstanceOf(File);
    expect(files[0]?.name).toMatch(/^voice-note-/);
  });
});
