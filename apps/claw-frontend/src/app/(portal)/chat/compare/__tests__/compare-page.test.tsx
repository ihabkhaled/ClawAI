import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ComparePage from '@/app/(portal)/chat/compare/page';
import { ResearchMode } from '@/enums';
import { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';
import type {
  ComposerAttachmentChip,
  PendingComposerUpload,
} from '@/types/composer-attachment.types';

// Compare is the one chat mode that does NOT compose OrchestrationPageShell,
// so the recorder and the shared research control had to be wired by hand.
// This test is about those two controls being in the composer row at all.
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined ? key : `${key}:${Object.values(params).join(',')}`,
  }),
}));
vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
// The grouped "+" menu and the research chip are the shared chat components; their own tests
// cover them. This file only needs to know Compare mounts them with the right values.
vi.mock('@/components/chat/composer-plus-menu', () => ({
  ComposerPlusMenu: ({
    canResearch,
    threadId,
    draftContextPacks,
  }: {
    canResearch: boolean;
    threadId: string | null;
    draftContextPacks?: { selectedIds: string[] };
  }) => (
    <div
      data-testid="composer-plus-menu"
      data-can-research={String(canResearch)}
      data-thread-id={String(threadId)}
      data-has-draft-packs={String(draftContextPacks !== undefined)}
    />
  ),
}));
vi.mock('@/components/chat/composer-research-chip', () => ({
  ComposerResearchChip: ({ value }: { value: { mode: string } }) => (
    <div data-testid="research-chip" data-mode={value.mode} />
  ),
}));
vi.mock('@/components/chat/composer-dropzone', () => ({
  ComposerDropzone: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/chat/parallel-model-selector', () => ({
  ParallelModelSelector: () => <div data-testid="model-selector" />,
}));
vi.mock('@/components/chat/daily-token-indicator', () => ({
  DailyTokenIndicator: () => <div data-testid="daily-tokens" />,
}));
vi.mock('@/hooks/chat/use-available-connector-models', () => ({
  useAvailableConnectorModels: () => ({ models: [], isLoading: false }),
}));
vi.mock('@/hooks/plans/use-entitlements', () => ({
  useEntitlements: () => ({ entitlements: null, isLoading: false }),
}));
vi.mock('@/hooks/auth/use-plan-features', () => ({
  usePlanFeatures: () => ({ has: () => true, isAdmin: false, isLoading: false }),
}));

const setResearch = vi.fn();
const mockCancelUpload = vi.fn();
let mockChips: ComposerAttachmentChip[] = [];
let mockPendingUploads: PendingComposerUpload[] = [];

vi.mock('@/hooks/chat/use-parallel-compare-page', () => ({
  useParallelComparePage: () => ({
    contextPackIds: [],
    setContextPackIds: vi.fn(),
    t: (key: string) => key,
    selectedModels: [],
    prompt: '',
    setPrompt: vi.fn(),
    handleToggleModel: vi.fn(),
    handleSend: vi.fn(),
    result: undefined,
    isPending: false,
    isError: false,
    canSend: false,
    selectionError: null,
    pollingMessages: [],
    isPolling: false,
    allResponded: false,
    laneStreams: {},
    handleViewInThread: vi.fn(),
    judgeEnabled: false,
    setJudgeEnabled: vi.fn(),
    judgeModel: null,
    setJudgeModel: vi.fn(),
    judgeModelOptions: [],
    isJudgeModelOptionsLoading: false,
    criticEnabled: false,
    setCriticEnabled: vi.fn(),
    criticModel: null,
    setCriticModel: vi.fn(),
    research: { mode: ResearchMode.AUTO },
    setResearch,
    researchProviders: [],
    isResearchProvidersLoading: false,
    selectedFileIds: [],
    setSelectedFileIds: vi.fn(),
    ingestFiles: vi.fn(),
    attachmentTray: {
      fileIds: [],
      pendingUploads: mockPendingUploads,
      progress: null,
      onRemove: vi.fn(),
      onCancelUpload: mockCancelUpload,
    },
    attachmentChips: { chips: mockChips, listLabel: 'Attachments', onRemove: vi.fn() },
    pluginMentions: {
      refs: [],
      options: [],
      isFull: false,
      arm: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      payload: {},
    },
    upgradeFeature: null,
    clearUpgradeFeature: vi.fn(),
  }),
}));

describe('ComparePage — composer controls', () => {
  it('renders the voice/video recorder', () => {
    render(<ComparePage />);
    expect(screen.getByTestId('voice-video-recorder-audio')).toBeInTheDocument();
    expect(screen.getByTestId('voice-video-recorder-video')).toBeInTheDocument();
  });

  it('has the same grouped "+" menu as chat, not loose buttons (rules/59)', () => {
    render(<ComparePage />);
    const menu = screen.getByTestId('composer-plus-menu');
    expect(menu).toBeInTheDocument();
    // Compare has no thread until it runs, so it holds its pack choice for the run.
    expect(menu).toHaveAttribute('data-thread-id', 'null');
    expect(menu).toHaveAttribute('data-has-draft-packs', 'true');
    expect(screen.queryByTestId('orchestration-context-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('prompt-library-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
  });

  it('offers research from the menu and names the mode in the shared chip', () => {
    render(<ComparePage />);
    expect(screen.getByTestId('composer-plus-menu')).toHaveAttribute('data-can-research', 'true');
    expect(screen.getByTestId('research-chip')).toHaveAttribute('data-mode', ResearchMode.AUTO);
    expect(screen.queryByText('compare.research.label')).not.toBeInTheDocument();
  });
});

// Compare used to show only a paperclip count and a progress bar. It renders
// the chat composer's own tray + chip strip now (useComposerAttachmentSurface).
describe('ComparePage — per-attachment status (same as chat)', () => {
  afterEach(() => {
    mockChips = [];
    mockPendingUploads = [];
    mockCancelUpload.mockReset();
  });

  it('shows a not-supported file as a chip with its state word', () => {
    mockChips = [
      {
        key: 'upload-1',
        filename: 'empty.txt',
        state: ComposerAttachmentState.Unsupported,
        fileId: null,
        localId: 'upload-1',
        detail: null,
        detailKey: null,
        canCancelProcessing: false,
        displayName: 'empty.txt',
        stateLabel: 'Not supported',
        note: 'File must not be empty',
        removeLabel: 'Remove empty.txt',
      },
    ];
    render(<ComparePage />);

    expect(screen.getByTestId('composer-attachment-chip')).toHaveAttribute(
      'data-state',
      ComposerAttachmentState.Unsupported,
    );
    expect(screen.getByTestId('composer-attachment-chip-note')).toHaveTextContent(
      'File must not be empty',
    );
  });

  it('lets a file still uploading be cancelled from its tile', () => {
    mockPendingUploads = [
      { key: 'upload-2', filename: 'talk.mp4', mimeType: 'video/mp4', sizeBytes: 2048 },
    ];
    render(<ComparePage />);

    const cancel = screen.getByTestId('composer-pending-attachment-cancel');
    expect(cancel).toHaveAccessibleName('chat.attachment.cancelUpload:talk.mp4');
    fireEvent.click(cancel);
    expect(mockCancelUpload).toHaveBeenCalledWith('upload-2');
  });
});
