import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompareResearchMode } from '@/enums';
import { useThreadDetailPage } from '@/hooks/chat/use-thread-detail-page';

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ threadId: 'thread-123' })),
}));

vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: (): { t: (k: string) => string } => ({ t: (k: string) => k }),
}));

const dataControllerMock = {
  thread: { id: 'thread-123', title: 'Test Thread', routingMode: 'AUTO', lastModel: 'gpt-4o' },
  messages: [],
  isLoadingThread: false,
  isLoadingMessages: false,
  isWaitingForResponse: false,
  fallbackAttempts: [],
  streamError: null,
  judgeEvaluating: false,
  executingModel: null,
  judgeModel: null,
  progressStages: [],
  currentStageLabel: null,
  streamLive: { content: '', reasoning: '', isStreaming: false },
  cancelStream: vi.fn(),
  isCancellingStream: false,
  isSending: false,
  isDeleting: false,
  virtualizedMessages: {
    messages: [],
    isLoading: false,
    isFetchingPreviousPage: false,
    isFetchingNextPage: false,
    hasPreviousPage: false,
    hasNextPage: false,
    fetchPreviousPage: vi.fn(),
    fetchNextPage: vi.fn(),
    totalCount: 0,
    firstItemIndex: 0,
  },
  virtualizedMessagesProps: {} as never,
  threadSettings: {
    isOpen: false,
    toggleOpen: vi.fn(),
    systemPrompt: '',
    setSystemPrompt: vi.fn(),
    temperature: 0.7,
    setTemperature: vi.fn(),
    maxTokens: '',
    setMaxTokens: vi.fn(),
    selectedModel: null,
    setSelectedModel: vi.fn(),
    handleModelChange: vi.fn(),
    contextPackIds: [],
    setContextPackIds: vi.fn(),
    judgeEnabled: false,
    setJudgeEnabled: vi.fn(),
    judgeModel: null,
    setJudgeModel: vi.fn(),
    judgeModelOptions: [],
    judgeModelOptionsLoading: false,
    criticEnabled: false,
    setCriticEnabled: vi.fn(),
    criticModel: null,
    setCriticModel: vi.fn(),
    criticEnablementDisabled: false,
    qualityThreshold: 0.4,
    setQualityThreshold: vi.fn(),
    maxReRouteAttempts: 2,
    setMaxReRouteAttempts: vi.fn(),
    useMemory: true,
    setUseMemory: vi.fn(),
    useContext: true,
    setUseContext: vi.fn(),
    handleSave: vi.fn(),
    isPending: false,
    maxTokensError: null,
    canSave: true,
  },
  handleSend: vi.fn(),
  handleDelete: vi.fn(),
  handleFeedback: vi.fn(),
  handleRegenerate: vi.fn(),
};

vi.mock('@/hooks/chat/use-thread-data-controller', () => ({
  useThreadDataController: vi.fn(() => dataControllerMock),
}));

const editableTitleMock = {
  isEditing: false,
  editValue: '',
  setEditValue: vi.fn(),
  isPending: false,
  startEditing: vi.fn(),
  cancelEditing: vi.fn(),
  saveTitle: vi.fn(),
  handleKeyDown: vi.fn(),
};

vi.mock('@/hooks/chat/use-editable-title', () => ({
  useEditableTitle: vi.fn(() => editableTitleMock),
}));

vi.mock('@/hooks/chat/use-resizable-composer', () => ({
  useResizableComposer: vi.fn(() => ({ composerHeight: 200, handleMouseDown: vi.fn() })),
}));

const planFeaturesMock = { has: vi.fn(() => true), isAdmin: true, isLoading: false };

vi.mock('@/hooks/auth/use-plan-features', () => ({
  usePlanFeatures: vi.fn(() => planFeaturesMock),
}));

const compareMock = {
  isOpen: false,
  toggleOpen: vi.fn(),
  selectedModels: [],
  handleToggleModel: vi.fn(),
  prompt: '',
  setPrompt: vi.fn(),
  handleSend: vi.fn(),
  handleCompare: vi.fn(),
  result: undefined,
  isPending: false,
  isError: false,
  canSend: false,
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
  researchMode: CompareResearchMode.NONE,
  setResearchMode: vi.fn(),
  selectedFileIds: [],
  setSelectedFileIds: vi.fn(),
};

// Share management pulls a TanStack query; mocked here for the same reason every
// other composed hook is — this file tests the composition, not the data layer.
const shareControllerMock = {
  buttonProps: { label: 'chatShare.button.label', isShared: false, onClick: vi.fn() },
  dialogProps: {} as never,
};

vi.mock('@/hooks/chat-shares/use-share-chat-controller', () => ({
  useShareChatController: vi.fn(() => shareControllerMock),
}));
vi.mock('@/hooks/chat/use-in-thread-compare', () => ({
  useInThreadCompare: vi.fn(() => compareMock),
}));

describe('useThreadDetailPage — composes every page-level hook', () => {
  it('returns a single shellProps bag wired from every composed hook', () => {
    const { result } = renderHook(() => useThreadDetailPage());

    expect(result.current.shellProps.threadId).toBe('thread-123');
    expect(result.current.shellProps.title).toBe('Test Thread');
    expect(result.current.shellProps.canCompare).toBe(true);
    expect(result.current.shellProps.canUseQualityControls).toBe(true);
    expect(result.current.shellProps.composerHeight).toBe(200);
    expect(result.current.shellProps.editableTitle).toBe(editableTitleMock);
    expect(result.current.shellProps.composerProps.threadId).toBe('thread-123');
    expect(result.current.shellProps.threadSettingsProps.systemPrompt).toBe('');
    expect(result.current.shellProps.threadQualityPanelProps.judgeEnabled).toBe(false);
    expect(result.current.shellProps.inThreadComparePanelProps.allowJudgeMode).toBe(true);
    expect(result.current.shellProps.backToThreadsHref).toBe('/chat');
  });

  it('falls back to chat.untitled when the thread has no title', async () => {
    const mod = await import('@/hooks/chat/use-thread-data-controller');
    vi.mocked(mod.useThreadDataController).mockReturnValueOnce({
      ...dataControllerMock,
      thread: null,
    });
    const { result } = renderHook(() => useThreadDetailPage());
    expect(result.current.shellProps.title).toBe('chat.untitled');
  });

  it('marks isLoadingPlaceholder true when threadId is missing', async () => {
    const nav = await import('next/navigation');
    vi.mocked(nav.useParams).mockReturnValueOnce({});
    const { result } = renderHook(() => useThreadDetailPage());
    expect(result.current.shellProps.isLoadingPlaceholder).toBe(true);
    expect(result.current.shellProps.threadId).toBe('');
  });
});
