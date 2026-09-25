import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useComposerAttachments = vi.fn();

vi.mock('@/hooks/files/use-composer-attachments', () => ({
  useComposerAttachments: (...args: unknown[]) => useComposerAttachments(...args),
}));
vi.mock('@/hooks/research/use-research-providers', () => ({
  useResearchProviders: () => ({ providers: [], isLoading: false }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const { useMessageComposerState } = await import('../use-message-composer-state');

// "I can send attachments/files WITHOUT text." A voice note or a PDF with an
// empty prompt is a complete message; nothing at all is still refused.
describe('useMessageComposerState — attachment-only sends', () => {
  const onSend = vi.fn();

  beforeEach(() => {
    onSend.mockReset();
    useComposerAttachments.mockReturnValue({
      ingestFiles: vi.fn(),
      removeAttachment: vi.fn(),
      pendingUploads: [],
      isUploading: false,
      progress: null,
    });
  });

  it('sends an empty prompt when a file is attached, with the file', () => {
    const { result } = renderHook(() =>
      useMessageComposerState({ onSend, isPending: false, selectedModel: null, threadId: 'a1' }),
    );

    act(() => {
      result.current.setSelectedFileIds(['voice-1']);
    });
    act(() => {
      result.current.submit();
    });

    expect(onSend).toHaveBeenCalledWith('', undefined, ['voice-1'], expect.anything());
    expect(result.current.selectedFileIds).toEqual([]);
  });

  it('still refuses an empty prompt with nothing attached', () => {
    const { result } = renderHook(() =>
      useMessageComposerState({ onSend, isPending: false, selectedModel: null, threadId: 'a2' }),
    );

    act(() => {
      result.current.handleValueChange('   ');
    });
    act(() => {
      result.current.submit();
    });

    expect(onSend).not.toHaveBeenCalled();
    expect(result.current.validationError).not.toBeNull();
  });
});
