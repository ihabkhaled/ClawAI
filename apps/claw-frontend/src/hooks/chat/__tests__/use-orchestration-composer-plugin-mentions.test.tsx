import type { PluginMentionView } from '@claw/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { createElement, useState } from 'react';
import type { PropsWithChildren, ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useOrchestrationComposer } from '@/hooks/chat/use-orchestration-composer';

vi.mock('@/hooks/files/use-chunked-upload', () => ({
  useChunkedUpload: () => ({ upload: vi.fn(), progress: null, isUploading: false, error: null }),
}));
vi.mock('@/hooks/files/use-files', () => ({ useFiles: () => ({ files: [] }) }));
vi.mock('@/repositories/files/files.repository', () => ({
  filesRepository: { cancelProcessing: vi.fn() },
}));
vi.mock('@/hooks/chat/use-plugin-mention-options', () => ({
  usePluginMentionOptions: () => [],
}));
vi.mock('@/hooks/research/use-research-providers', () => ({
  useResearchProviders: () => ({ providers: [], isLoading: false }),
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/utilities', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  showToast: { success: vi.fn(), error: vi.fn(), apiError: vi.fn() },
}));

const WEB: PluginMentionView = {
  installId: 'i-web',
  slug: 'web-fetch',
  name: 'Web fetch',
  iconKey: 'globe',
  enabled: true,
};

function wrapper({ children }: PropsWithChildren): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

/** A lab page: it owns the prompt and hands it over, as the seven answering labs do. */
function useLabPage() {
  const [content, setContent] = useState('');
  const composer = useOrchestrationComposer(false, { value: content, onValueChange: setContent });
  return { content, setContent, composer };
}

describe('useOrchestrationComposer — @mentioned plugins (rule 59)', () => {
  it('puts the chips in sharedPayload, the one spread every lab hook uses', () => {
    const { result } = renderHook(() => useLabPage(), { wrapper });
    act(() => {
      result.current.composer.pluginMentions?.add(WEB, '');
      result.current.setContent('read the page @Web fetch ');
    });
    expect(result.current.composer.sharedPayload).toMatchObject({
      pluginRefs: [{ installId: 'i-web', label: 'Web fetch' }],
    });
  });

  it('keeps research and packs in the same spread', () => {
    const { result } = renderHook(() => useLabPage(), { wrapper });
    act(() => {
      result.current.composer.setContextPackIds(['pack-1']);
      result.current.composer.pluginMentions?.add(WEB, '');
      result.current.setContent('@Web fetch ');
    });
    expect(result.current.composer.sharedPayload).toMatchObject({
      contextPackIds: ['pack-1'],
      pluginRefs: [{ installId: 'i-web', label: 'Web fetch' }],
    });
  });

  it('drops the mention on clear(): a lab run is one question', () => {
    const { result } = renderHook(() => useLabPage(), { wrapper });
    act(() => {
      result.current.composer.pluginMentions?.add(WEB, '');
      result.current.setContent('@Web fetch ');
    });
    act(() => {
      result.current.composer.clear();
    });
    expect(result.current.composer.sharedPayload).not.toHaveProperty('pluginRefs');
  });

  it('gives a page that did not hand over its prompt no picker and no pluginRefs', () => {
    const { result } = renderHook(() => useOrchestrationComposer(), { wrapper });
    expect(result.current.pluginMentions).toBeUndefined();
    expect(result.current.sharedPayload).not.toHaveProperty('pluginRefs');
  });
});
