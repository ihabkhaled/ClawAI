import type { PluginMentionView } from '@claw/shared-types';
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PLUGIN_MENTION_MAX } from '@/constants/plugin-mention.constants';
import { usePluginMentionSelection } from '@/hooks/chat/use-plugin-mention-selection';

const optionsHook = vi.hoisted(() => ({ calls: [] as boolean[] }));
vi.mock('@/hooks/chat/use-plugin-mention-options', () => ({
  usePluginMentionOptions: (enabled: boolean) => {
    optionsHook.calls.push(enabled);
    return [];
  },
}));

function view(name: string): PluginMentionView {
  return {
    installId: `id-${name}`,
    slug: name.toLowerCase(),
    name,
    iconKey: 'globe',
    enabled: true,
  };
}

/** A composer: owns the text, hands it to the selection hook. */
function useHarness(initial = '') {
  const [value, setValue] = useState(initial);
  const selection = usePluginMentionSelection({ value, onValueChange: setValue });
  return { value, setValue, selection };
}

describe('usePluginMentionSelection', () => {
  it('starts empty and sends nothing', () => {
    const { result } = renderHook(() => useHarness());
    expect(result.current.selection.refs).toEqual([]);
    expect(result.current.selection.payload).toEqual({});
  });

  it('adds a chip and exposes it as pluginRefs once its @Name is in the text', () => {
    const { result } = renderHook(() => useHarness());
    act(() => {
      result.current.selection.add(view('Weather'), '');
      result.current.setValue('ask @Weather ');
    });
    expect(result.current.selection.refs).toEqual([{ installId: 'id-Weather', label: 'Weather' }]);
    expect(result.current.selection.payload).toEqual({
      pluginRefs: [{ installId: 'id-Weather', label: 'Weather' }],
    });
  });

  it('drops a chip when the user edits its @Name out of the text', () => {
    const { result } = renderHook(() => useHarness());
    act(() => {
      result.current.selection.add(view('Weather'), '');
      result.current.setValue('ask @Weather ');
    });
    act(() => {
      result.current.setValue('ask  ');
    });
    expect(result.current.selection.refs).toEqual([]);
    expect(result.current.selection.payload).toEqual({});
  });

  it('adding the same plugin twice keeps one chip', () => {
    const { result } = renderHook(() => useHarness());
    act(() => {
      result.current.selection.add(view('Weather'), '');
      result.current.selection.add(view('Weather'), '');
      result.current.setValue('@Weather ');
    });
    expect(result.current.selection.refs).toHaveLength(1);
  });

  it(`stops at ${String(PLUGIN_MENTION_MAX)} chips`, () => {
    const names = Array.from({ length: PLUGIN_MENTION_MAX + 2 }, (_, index) => `P${String(index)}`);
    const { result } = renderHook(() => useHarness(names.map((name) => `@${name} `).join('')));
    act(() => {
      for (const name of names) {
        result.current.selection.add(view(name), result.current.value);
      }
    });
    expect(result.current.selection.refs).toHaveLength(PLUGIN_MENTION_MAX);
    expect(result.current.selection.isFull).toBe(true);
  });

  it('remove drops the chip and its @Name from the text', () => {
    const { result } = renderHook(() => useHarness());
    act(() => {
      result.current.selection.add(view('Weather'), '');
      result.current.setValue('ask @Weather now');
    });
    act(() => {
      result.current.selection.remove('id-Weather');
    });
    expect(result.current.value).toBe('ask now');
    expect(result.current.selection.refs).toEqual([]);
  });

  it('clear forgets every chip (a mention belongs to one message)', () => {
    const { result } = renderHook(() => useHarness());
    act(() => {
      result.current.selection.add(view('Weather'), '');
      result.current.setValue('@Weather ');
    });
    act(() => {
      result.current.selection.clear();
    });
    // The text still says @Weather, but the chip is gone: it was sent with the last message.
    expect(result.current.selection.refs).toEqual([]);
  });

  it('only fetches the list once the user has typed an @ (arm)', () => {
    optionsHook.calls.length = 0;
    const { result } = renderHook(() => useHarness());
    expect(optionsHook.calls.at(-1)).toBe(false);
    act(() => {
      result.current.selection.arm();
    });
    expect(optionsHook.calls.at(-1)).toBe(true);
  });
});
