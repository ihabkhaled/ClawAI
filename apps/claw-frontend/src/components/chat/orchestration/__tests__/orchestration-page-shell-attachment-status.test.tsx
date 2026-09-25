import { fireEvent, render, screen } from '@testing-library/react';
import { Sparkles } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { OrchestrationPageShell } from '@/components/chat/orchestration/orchestration-page-shell';
import { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';
import { ResearchMode } from '@/enums/research-mode.enum';
import type { ComposerAttachmentChip } from '@/types/composer-attachment.types';
import type { UseOrchestrationComposerReturn } from '@/types/hook.types';
import type { OrchestrationPageShellProps } from '@/types/orchestration.types';

// Every orchestration lab renders its composer through this shell. It used to
// show "Uploading… (N)" and a progress bar; it now renders the chat
// composer's own tray (with a cancel on a file still uploading) and chip strip.

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined ? key : `${key}:${Object.values(params).join(',')}`,
  }),
}));
vi.mock('@/components/chat/file-attachment-picker', () => ({
  FileAttachmentPicker: () => <div data-testid="picker" />,
}));
vi.mock('@/components/chat/composer-dropzone', () => ({
  ComposerDropzone: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/chat/orchestration/orchestration-single-model-select', () => ({
  OrchestrationSingleModelSelect: () => <div data-testid="model-select" />,
}));
vi.mock('@/components/chat/voice-video-recorder', () => ({
  VoiceVideoRecorder: () => <div data-testid="recorder" />,
}));
vi.mock('@/components/chat/research-toggle', () => ({
  ResearchToggle: () => <div data-testid="research-toggle" />,
}));
vi.mock('@/hooks/chat/use-model-media-capabilities', () => ({
  useModelMediaCapabilities: () => ({ canSendAudio: true, canSendVideo: true }),
}));
vi.mock('@/hooks/auth/use-plan-features', () => ({
  usePlanFeatures: () => ({ has: () => false, isAdmin: false, isLoading: false }),
}));

const FAILED_CHIP: ComposerAttachmentChip = {
  key: 'upload-1',
  filename: 'broken.pdf',
  state: ComposerAttachmentState.Failed,
  fileId: null,
  localId: 'upload-1',
  detail: null,
  canCancelProcessing: false,
  displayName: 'broken.pdf',
  stateLabel: 'Failed',
  note: 'The connection dropped',
  removeLabel: 'Remove broken.pdf',
};

function buildComposer(onCancelUpload: (key: string) => void): UseOrchestrationComposerReturn {
  return {
    selectedFileIds: [],
    setSelectedFileIds: vi.fn(),
    ingestFiles: vi.fn(),
    isUploading: true,
    pendingCount: 1,
    progress: null,
    attachmentTray: {
      fileIds: [],
      pendingUploads: [
        { key: 'upload-2', filename: 'lecture.mp4', mimeType: 'video/mp4', sizeBytes: 4096 },
      ],
      progress: null,
      onRemove: vi.fn(),
      onCancelUpload,
    },
    attachmentChips: { chips: [FAILED_CHIP], listLabel: 'Attachments', onRemove: vi.fn() },
    research: { mode: ResearchMode.AUTO },
    setResearch: vi.fn(),
    researchProviders: [],
    isResearchProvidersLoading: false,
    researchPayload: { researchMode: ResearchMode.AUTO },
    clear: vi.fn(),
  };
}

function renderShell(composer: UseOrchestrationComposerReturn): void {
  const props: OrchestrationPageShellProps = {
    headerIcon: Sparkles,
    headerTitle: 'Lab',
    headerDescription: 'Lab description',
    selectedModel: { provider: 'OLLAMA', model: 'some-model', displayName: 'Some Model' },
    onModelChange: vi.fn(),
    composer,
    prompt: 'a real prompt',
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

describe('OrchestrationPageShell — per-attachment status (same as chat)', () => {
  it('shows a failed upload as a chip with its state word and reason', () => {
    renderShell(buildComposer(vi.fn()));

    const chip = screen.getByTestId('composer-attachment-chip');
    expect(chip).toHaveAttribute('data-state', ComposerAttachmentState.Failed);
    expect(screen.getByTestId('composer-attachment-chip-state')).toHaveTextContent('Failed');
    expect(screen.getByTestId('composer-attachment-chip-note')).toHaveTextContent(
      'The connection dropped',
    );
  });

  it('lets a file still uploading be taken back from its tile', () => {
    const onCancelUpload = vi.fn();
    renderShell(buildComposer(onCancelUpload));

    const cancel = screen.getByTestId('composer-pending-attachment-cancel');
    expect(cancel).toHaveAccessibleName('chat.attachment.cancelUpload:lecture.mp4');
    fireEvent.click(cancel);

    expect(onCancelUpload).toHaveBeenCalledWith('upload-2');
  });

  it('no longer shows a bare pending count', () => {
    renderShell(buildComposer(vi.fn()));

    expect(screen.getByTestId('orchestration-upload-status')).not.toHaveTextContent('(1)');
  });
});
