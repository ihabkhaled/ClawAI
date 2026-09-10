import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ComposerControlVariant, PlanFeature } from '@/enums';
import { useMessageComposer } from '@/hooks/chat/use-message-composer';
import type { MessageComposerProps } from '@/types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: (): { t: (k: string) => string } => ({ t: (k: string) => k }),
}));

const planFeaturesMock = {
  has: vi.fn((_feature: PlanFeature): boolean => true),
  isAdmin: false,
  isLoading: false,
};
vi.mock('@/hooks/auth/use-plan-features', () => ({
  usePlanFeatures: (): typeof planFeaturesMock => planFeaturesMock,
}));

// The viewport answer this suite drives. useMessageComposer reads it once and
// turns it into two props, so flipping it here is how we prove a phone and a
// laptop get different controls from the same single render path.
let isWideViewport = true;
vi.mock('@/hooks/ui/use-media-query', () => ({
  useMediaQuery: (): boolean => isWideViewport,
}));

const composerStateMock = {
  content: '',
  setContent: vi.fn(),
  validationError: null as string | null,
  selectedFileIds: [] as string[],
  setSelectedFileIds: vi.fn(),
  research: { mode: 'NONE' },
  setResearch: vi.fn(),
  researchProviders: [],
  isResearchProvidersLoading: false,
  handleSubmit: vi.fn(),
  submit: vi.fn(),
  handleValueChange: vi.fn(),
  ingestFiles: vi.fn(),
  isUploadingAttachment: false,
};
vi.mock('@/hooks/chat/use-message-composer-state', () => ({
  useMessageComposerState: (): typeof composerStateMock => composerStateMock,
}));

const baseProps: MessageComposerProps = {
  onSend: vi.fn(),
  isPending: false,
  selectedModel: null,
  onModelChange: vi.fn(),
  threadId: 'thread-1',
};

describe('useMessageComposer', () => {
  beforeEach(() => {
    isWideViewport = true;
    composerStateMock.content = '';
    composerStateMock.validationError = null;
    composerStateMock.isUploadingAttachment = false;
    planFeaturesMock.has.mockReturnValue(true);
  });

  it('bounds the textarea by rows, not by pixels', () => {
    // The whole point of ADR-088: the composer has no height, it has a row
    // range. A pixel height here would mean something above it has to know and
    // persist that number, which is the failure this replaced.
    const { result } = renderHook(() => useMessageComposer(baseProps));

    expect(result.current.minRows).toBe(1);
    expect(result.current.maxRows).toBe(10);
    expect(result.current).not.toHaveProperty('height');
  });

  it('refuses to submit an empty or whitespace-only composer', () => {
    const { result, rerender } = renderHook(() => useMessageComposer(baseProps));
    expect(result.current.canSubmit).toBe(false);

    composerStateMock.content = '   \n  ';
    rerender();
    expect(result.current.canSubmit).toBe(false);

    composerStateMock.content = 'hello';
    rerender();
    expect(result.current.canSubmit).toBe(true);
  });

  it('refuses to submit while a send is already in flight', () => {
    composerStateMock.content = 'hello';
    const { result } = renderHook(() => useMessageComposer({ ...baseProps, isPending: true }));

    expect(result.current.canSubmit).toBe(false);
  });

  it('labels the model trigger on a wide viewport and hides the label on a phone', () => {
    const wide = renderHook(() => useMessageComposer(baseProps));
    expect(wide.result.current.toolbarProps.showModelLabel).toBe(true);
    expect(wide.result.current.toolbarProps.showCredit).toBe(true);

    isWideViewport = false;
    const narrow = renderHook(() => useMessageComposer(baseProps));
    expect(narrow.result.current.toolbarProps.showModelLabel).toBe(false);
    expect(narrow.result.current.toolbarProps.showCredit).toBe(false);
    // Compact at BOTH widths — the variant is not what the breakpoint changes.
    // Mounting a second, non-compact toolbar for desktop is what the old
    // composer did, and it duplicated every picker and its queries.
    expect(narrow.result.current.toolbarProps.controlVariant).toBe(ComposerControlVariant.Compact);
  });

  it('hides the research control when the plan does not unlock it', () => {
    planFeaturesMock.has.mockImplementation(
      (feature: PlanFeature) => feature !== PlanFeature.ALLOW_RESEARCH_MODE,
    );
    const { result } = renderHook(() => useMessageComposer(baseProps));

    expect(result.current.toolbarProps.canResearch).toBe(false);
  });

  it('surfaces the upload notice only while an attachment is uploading', () => {
    const { result, rerender } = renderHook(() => useMessageComposer(baseProps));
    expect(result.current.uploadingLabel).toBeNull();

    composerStateMock.isUploadingAttachment = true;
    rerender();
    expect(result.current.uploadingLabel).toBe('chat.attachment.uploading');
  });

  it('passes a null threadId through so the new-chat surface hides context preview', () => {
    const { result } = renderHook(() => useMessageComposer({ ...baseProps, threadId: undefined }));

    expect(result.current.toolbarProps.threadId).toBeNull();
  });
});
