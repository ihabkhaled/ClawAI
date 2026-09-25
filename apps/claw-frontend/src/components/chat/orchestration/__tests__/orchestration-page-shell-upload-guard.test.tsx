import { render, screen } from '@testing-library/react';
import { Sparkles } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { OrchestrationPageShell } from '@/components/chat/orchestration/orchestration-page-shell';
import { ResearchMode } from '@/enums/research-mode.enum';
import type { UseOrchestrationComposerReturn } from '@/types/hook.types';
import type { OrchestrationPageShellProps } from '@/types/orchestration.types';

vi.mock('@/components/chat/file-attachment-picker', () => ({
  FileAttachmentPicker: () => <div data-testid="picker" />,
}));
vi.mock('@/components/chat/composer-attachment-tray', () => ({
  ComposerAttachmentTray: () => <div data-testid="attachment-tray" />,
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

function buildComposer(
  overrides: Partial<UseOrchestrationComposerReturn> = {},
): UseOrchestrationComposerReturn {
  return {
    selectedFileIds: [],
    setSelectedFileIds: vi.fn(),
    ingestFiles: vi.fn(),
    isUploading: false,
    pendingCount: 0,
    progress: null,
    attachmentTray: { fileIds: [], pendingUploads: [], progress: null, onRemove: vi.fn() },
    attachmentChips: { chips: [], listLabel: 'Attachments', onRemove: vi.fn() },
    research: { mode: ResearchMode.AUTO },
    setResearch: vi.fn(),
    researchProviders: [],
    isResearchProvidersLoading: false,
    researchPayload: { researchMode: ResearchMode.AUTO },
    clear: vi.fn(),
    ...overrides,
  };
}

function renderShell(composer: UseOrchestrationComposerReturn, prompt = 'a real prompt'): void {
  const props: OrchestrationPageShellProps = {
    headerIcon: Sparkles,
    headerTitle: 'Lab',
    headerDescription: 'Lab description',
    selectedModel: { provider: 'OLLAMA', model: 'some-model', displayName: 'Some Model' },
    onModelChange: vi.fn(),
    composer,
    prompt,
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

// A file's progress bar reads 100% the instant the last byte lands; the real
// completion (server-side reassembly, the antivirus/magic-byte scan, the id
// landing in selectedFileIds) happens after that. Reproduced live: a message
// sent while `composer.isUploading` was still true went out with no
// attachment, and the model answered as if nothing had been sent
// (2026-09-24).
describe('OrchestrationPageShell — refuses to submit while an attachment is uploading', () => {
  it('disables Run while composer.isUploading is true, even with a valid prompt and model', () => {
    renderShell(buildComposer({ isUploading: true }));

    expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled();
  });

  it('enables Run once the upload settles', () => {
    renderShell(buildComposer({ isUploading: false }));

    expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled();
  });
});

// "I can send attachments/files WITHOUT text."
describe('OrchestrationPageShell — attachment-only runs', () => {
  it('enables Run with an attached file and an empty prompt', () => {
    renderShell(buildComposer({ selectedFileIds: ['file-1'] }), '');

    expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled();
  });

  it('keeps Run disabled with neither text nor files', () => {
    renderShell(buildComposer({ selectedFileIds: [] }), '   ');

    expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled();
  });

  it('renders the attachment tray above the prompt', () => {
    renderShell(buildComposer({ selectedFileIds: ['file-1'] }));

    expect(screen.getByTestId('attachment-tray')).toBeInTheDocument();
  });
});
