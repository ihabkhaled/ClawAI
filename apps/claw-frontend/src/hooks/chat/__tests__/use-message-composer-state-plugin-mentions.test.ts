import type { PluginMentionView } from '@claw/shared-types';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useComposerAttachments = vi.fn();

vi.mock('@/hooks/files/use-composer-attachments', () => ({
  useComposerAttachments: (...args: unknown[]) => useComposerAttachments(...args),
}));
vi.mock('@/hooks/chat/use-plugin-mention-options', () => ({
  usePluginMentionOptions: () => [],
}));
vi.mock('@/hooks/research/use-research-providers', () => ({
  useResearchProviders: () => ({ providers: [], isLoading: false }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const { useMessageComposerState } = await import('../use-message-composer-state');

const WEATHER: PluginMentionView = {
  installId: 'i-weather',
  slug: 'weather',
  name: 'Weather',
  iconKey: 'cloud',
  enabled: true,
};

// A mention is a typed field of the message: it leaves with the text, once.
describe('useMessageComposerState — @mentioned plugins', () => {
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

  function mention(result: { current: ReturnType<typeof useMessageComposerState> }): void {
    act(() => {
      result.current.pluginMentions.add(WEATHER, '');
      result.current.handleValueChange('is it raining @Weather ');
    });
  }

  it('sends the chips as the sixth argument, after the mask slot', () => {
    const { result } = renderHook(() =>
      useMessageComposerState({ onSend, isPending: false, selectedModel: null, threadId: 'p1' }),
    );
    mention(result);
    act(() => {
      result.current.submit();
    });

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith(
      'is it raining @Weather',
      undefined,
      undefined,
      expect.anything(),
      undefined,
      [{ installId: 'i-weather', label: 'Weather' }],
    );
  });

  it('forgets the chips once the message is sent', () => {
    const { result } = renderHook(() =>
      useMessageComposerState({ onSend, isPending: false, selectedModel: null, threadId: 'p2' }),
    );
    mention(result);
    act(() => {
      result.current.submit();
    });
    expect(result.current.pluginMentions.refs).toEqual([]);

    // The next message that happens to contain the same words does not re-send the plugin.
    act(() => {
      result.current.handleValueChange('and tomorrow @Weather ');
    });
    act(() => {
      result.current.submit();
    });
    expect(onSend).toHaveBeenLastCalledWith(
      'and tomorrow @Weather',
      undefined,
      undefined,
      expect.anything(),
    );
  });

  it('sends exactly the old arguments when nothing was mentioned', () => {
    const { result } = renderHook(() =>
      useMessageComposerState({ onSend, isPending: false, selectedModel: null, threadId: 'p3' }),
    );
    act(() => {
      result.current.handleValueChange('hello');
    });
    act(() => {
      result.current.submit();
    });
    expect(onSend).toHaveBeenCalledWith('hello', undefined, undefined, expect.anything());
  });

  it('does not send a plugin whose @Name the user deleted', () => {
    const { result } = renderHook(() =>
      useMessageComposerState({ onSend, isPending: false, selectedModel: null, threadId: 'p4' }),
    );
    mention(result);
    act(() => {
      result.current.handleValueChange('is it raining');
    });
    act(() => {
      result.current.submit();
    });
    expect(onSend).toHaveBeenCalledWith('is it raining', undefined, undefined, expect.anything());
  });
});
