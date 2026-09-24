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
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const { useMessageComposerState } = await import('../use-message-composer-state');

// A file's upload progress reaches 100% the instant the last byte lands; the
// real completion (server-side reassembly, the antivirus/magic-byte scan,
// the id landing in selectedFileIds) happens after that. A message sent in
// that window went out with no attachment at all — reproduced live
// 2026-09-24, "Check this file" answered as if nothing had been attached.
describe('useMessageComposerState — refuses to send while an attachment is still uploading', () => {
  const onSend = vi.fn();

  beforeEach(() => {
    onSend.mockReset();
    useComposerAttachments.mockReturnValue({
      ingestFiles: vi.fn(),
      isUploading: true,
      progress: null,
    });
  });

  it('submit() refuses and sets a validation error instead of calling onSend', () => {
    const { result } = renderHook(() =>
      useMessageComposerState({ onSend, isPending: false, selectedModel: null, threadId: 't1' }),
    );

    act(() => {
      result.current.handleValueChange('check this file');
    });
    act(() => {
      result.current.submit();
    });

    expect(onSend).not.toHaveBeenCalled();
    expect(result.current.validationError).toBe('chat.attachment.stillUploadingRefusal');
    // The typed content survives the refusal — it is not a failed send, it's
    // a "not yet" the user can retry once the upload settles.
    expect(result.current.content).toBe('check this file');
  });

  it('handleSubmit() (the form-submit / Enter-key path) refuses the same way', () => {
    const { result } = renderHook(() =>
      useMessageComposerState({ onSend, isPending: false, selectedModel: null, threadId: 't2' }),
    );

    act(() => {
      result.current.handleValueChange('hello');
    });
    act(() => {
      result.current.handleSubmit({
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent);
    });

    expect(onSend).not.toHaveBeenCalled();
    expect(result.current.validationError).toBe('chat.attachment.stillUploadingRefusal');
  });

  it('sends normally once the upload finishes', () => {
    useComposerAttachments.mockReturnValue({
      ingestFiles: vi.fn(),
      isUploading: false,
      progress: null,
    });

    const { result } = renderHook(() =>
      useMessageComposerState({ onSend, isPending: false, selectedModel: null, threadId: 't3' }),
    );

    act(() => {
      result.current.handleValueChange('hello');
    });
    act(() => {
      result.current.submit();
    });

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(result.current.validationError).toBeNull();
  });
});
