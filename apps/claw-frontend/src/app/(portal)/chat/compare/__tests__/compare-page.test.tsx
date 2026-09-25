import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ComparePage from '@/app/(portal)/chat/compare/page';
import { ResearchMode } from '@/enums';

// Compare is the one chat mode that does NOT compose OrchestrationPageShell,
// so the recorder and the shared research control had to be wired by hand.
// This test is about those two controls being in the composer row at all.
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/components/chat/file-attachment-picker', () => ({
  FileAttachmentPicker: () => <div data-testid="picker" />,
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

vi.mock('@/hooks/chat/use-parallel-compare-page', () => ({
  useParallelComparePage: () => ({
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

  it('renders the SHARED research toggle, not the old compare-only control', () => {
    render(<ComparePage />);
    expect(screen.getByLabelText('research.toggle.modeLabel')).toBeInTheDocument();
    expect(screen.queryByText('compare.research.label')).not.toBeInTheDocument();
  });

  it('shows the provider dropdown Compare never had, because the mode is AUTO', () => {
    render(<ComparePage />);
    expect(screen.getByLabelText('research.toggle.providerLabel')).toBeInTheDocument();
  });
});
