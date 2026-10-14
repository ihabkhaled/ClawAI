import { render, screen } from '@testing-library/react';
import { Sparkles } from 'lucide-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrchestrationPageShell } from '@/components/chat/orchestration/orchestration-page-shell';
import { PlanFeature } from '@/enums/plan-feature.enum';
import { ResearchMode } from '@/enums/research-mode.enum';
import type { UseOrchestrationComposerReturn } from '@/types/hook.types';
import type { OrchestrationPageShellProps } from '@/types/orchestration.types';

// The grouped "+" menu and the research chip are the shared chat components; their own tests
// cover them. This file only needs to know the shell mounts them with the right values.
vi.mock('@/components/chat/composer-plus-menu', () => ({
  ComposerPlusMenu: ({
    canResearch,
    threadId,
  }: {
    canResearch: boolean;
    threadId: string | null;
  }) => (
    <div
      data-testid="composer-plus-menu"
      data-can-research={String(canResearch)}
      data-thread-id={String(threadId)}
    />
  ),
}));
vi.mock('@/components/chat/composer-research-chip', () => ({
  ComposerResearchChip: ({ value }: { value: { mode: string } }) => (
    <div data-testid="research-chip" data-mode={value.mode} />
  ),
}));

const hasFeatureMock = vi.fn();

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

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
vi.mock('@/hooks/chat/use-model-media-capabilities', () => ({
  useModelMediaCapabilities: () => ({ canSendAudio: true, canSendVideo: true }),
}));
vi.mock('@/hooks/auth/use-plan-features', () => ({
  usePlanFeatures: () => ({ has: hasFeatureMock, isAdmin: false, isLoading: false }),
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
    contextPackIds: [],
    setContextPackIds: vi.fn(),
    contextPackPayload: {},
    sharedPayload: { researchMode: ResearchMode.AUTO },
    clear: vi.fn(),
    ...overrides,
  };
}

function renderShell(composer: UseOrchestrationComposerReturn | undefined): void {
  const props: OrchestrationPageShellProps = {
    headerIcon: Sparkles,
    headerTitle: 'Lab',
    headerDescription: 'Lab description',
    selectedModel: null,
    onModelChange: vi.fn(),
    composer,
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

describe('OrchestrationPageShell — research control', () => {
  beforeEach(() => {
    hasFeatureMock.mockReset();
  });

  it('lets the "+" menu offer research and names the mode in a chip when the plan allows it', () => {
    hasFeatureMock.mockImplementation((feature) => feature === PlanFeature.ALLOW_RESEARCH_MODE);

    renderShell(buildComposer());

    expect(screen.getByTestId('composer-plus-menu')).toHaveAttribute('data-can-research', 'true');
    const chip = screen.getByTestId('research-chip');
    expect(chip).toHaveAttribute('data-mode', ResearchMode.AUTO);
  });

  it('draws no research chip while research is off', () => {
    hasFeatureMock.mockImplementation((feature) => feature === PlanFeature.ALLOW_RESEARCH_MODE);

    renderShell(buildComposer({ research: { mode: ResearchMode.NONE } }));

    expect(screen.queryByTestId('research-chip')).not.toBeInTheDocument();
  });

  it('hides research from the menu and the chip when the plan does not unlock it', () => {
    hasFeatureMock.mockReturnValue(false);

    renderShell(buildComposer());

    expect(screen.getByTestId('composer-plus-menu')).toHaveAttribute('data-can-research', 'false');
    expect(screen.queryByTestId('research-chip')).not.toBeInTheDocument();
    // The rest of the attachment row is unaffected by the research gate.
    expect(screen.getByTestId('orchestration-attachments')).toBeInTheDocument();
  });

  it('renders no menu and no chip for a page that passes no composer', () => {
    hasFeatureMock.mockReturnValue(true);

    renderShell(undefined);

    expect(screen.queryByTestId('composer-plus-menu')).not.toBeInTheDocument();
    expect(screen.queryByTestId('research-chip')).not.toBeInTheDocument();
  });
});

describe('OrchestrationPageShell — upload status', () => {
  beforeEach(() => {
    hasFeatureMock.mockReset();
    hasFeatureMock.mockReturnValue(false);
  });

  it('shows nothing while no upload is in flight', () => {
    renderShell(buildComposer());

    expect(screen.queryByTestId('orchestration-upload-status')).not.toBeInTheDocument();
  });

  // The bare count is gone: each file has its own tile and state in the tray,
  // exactly as in the chat composer, so the line is the same one sentence.
  it('shows the uploading label, without a bare count, while uploading', () => {
    renderShell(buildComposer({ isUploading: true, pendingCount: 2 }));

    const status = screen.getByTestId('orchestration-upload-status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveTextContent('chat.attachment.uploading');
    expect(status).not.toHaveTextContent('(2)');
  });
});
