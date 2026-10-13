import type { PluginAdminCatalogEntryView, PluginSettingView } from '@claw/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminPluginsTab } from '@/enums/admin-plugins-tab.enum';
import { pluginAdminRepository } from '@/repositories/plugins/plugin-admin.repository';
import { ApiClientError } from '@/services/shared/api-client';

import { useAdminPluginCatalog } from '../use-admin-plugin-catalog';
import { useAdminPluginSettings } from '../use-admin-plugin-settings';
import { useAdminPluginsPage } from '../use-admin-plugins-page';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));
vi.mock('@/repositories/plugins/plugin-admin.repository', () => ({
  pluginAdminRepository: {
    listCatalog: vi.fn(),
    updateCatalogEntry: vi.fn(),
    listSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

const repo = vi.mocked(pluginAdminRepository);

const ENTRY: PluginAdminCatalogEntryView = {
  slug: 'web-fetch',
  name: 'Web fetch',
  publisher: 'ClawAI',
  category: 'search',
  iconKey: 'globe',
  source: 'FIRST_PARTY',
  status: 'PUBLISHED',
  version: '1.0.0',
  globallyEnabled: true,
  featured: false,
  installCount: 3,
  tools: [{ name: 'fetch_page', riskLevel: 'READ', disabledByAdmin: false }],
};

const SETTINGS: PluginSettingView[] = [
  { key: 'userServers.enabled', value: true, updatedAt: null },
  { key: 'loop.maxRounds', value: 5, updatedAt: null },
];

function render<T>(hook: () => T) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(hook, { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  repo.listCatalog.mockResolvedValue([ENTRY]);
  repo.listSettings.mockResolvedValue(SETTINGS);
});

describe('useAdminPluginCatalog', () => {
  it('lists the entries', async () => {
    const { result } = render(() => useAdminPluginCatalog());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
  });

  it('sends the kill switch, the featured flag and one tool at a time', async () => {
    repo.updateCatalogEntry.mockResolvedValue(ENTRY);
    const { result } = render(() => useAdminPluginCatalog());
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    act(() => result.current.setGloballyEnabled('web-fetch', false));
    await waitFor(() =>
      expect(repo.updateCatalogEntry).toHaveBeenCalledWith('web-fetch', { globallyEnabled: false }),
    );
    act(() => result.current.setFeatured('web-fetch', true));
    await waitFor(() =>
      expect(repo.updateCatalogEntry).toHaveBeenCalledWith('web-fetch', { featured: true }),
    );
    act(() => result.current.setToolDisabled('web-fetch', 'fetch_page', true));
    await waitFor(() =>
      expect(repo.updateCatalogEntry).toHaveBeenCalledWith('web-fetch', {
        tools: [{ name: 'fetch_page', disabledByAdmin: true }],
      }),
    );
  });

  it('marks the slug pending while a change is in flight, then clears it', async () => {
    let release: (value: PluginAdminCatalogEntryView) => void = () => undefined;
    repo.updateCatalogEntry.mockReturnValue(new Promise((resolve) => (release = resolve)));
    const { result } = render(() => useAdminPluginCatalog());
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    act(() => result.current.setGloballyEnabled('web-fetch', false));
    await waitFor(() => expect(result.current.pendingSlug).toBe('web-fetch'));
    await act(async () => release(ENTRY));
    await waitFor(() => expect(result.current.pendingSlug).toBeNull());
  });

  it('reports a failure message and a load error with retry', async () => {
    repo.updateCatalogEntry.mockRejectedValue(new ApiClientError({ message: 'x', status: 404 }));
    const { result } = render(() => useAdminPluginCatalog());
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    act(() => result.current.setFeatured('web-fetch', true));
    await waitFor(() => expect(result.current.errorMessage).toBe('pluginsInstall.errors.notFound'));

    repo.listCatalog.mockRejectedValueOnce(new Error('down'));
    const failing = render(() => useAdminPluginCatalog());
    await waitFor(() => expect(failing.result.current.isError).toBe(true));
    repo.listCatalog.mockResolvedValue([ENTRY]);
    act(() => failing.result.current.retry());
    await waitFor(() => expect(failing.result.current.entries).toHaveLength(1));
  });
});

describe('useAdminPluginSettings', () => {
  it('starts clean from the saved values', async () => {
    const { result } = render(() => useAdminPluginSettings());
    await waitFor(() => expect(result.current.settings).toHaveLength(2));
    expect(result.current.draft).toEqual({ 'userServers.enabled': true, 'loop.maxRounds': '5' });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.saved).toBe(false);
  });

  it('saves only the changed values and then reports saved', async () => {
    repo.updateSettings.mockResolvedValue(SETTINGS);
    const { result } = render(() => useAdminPluginSettings());
    await waitFor(() => expect(result.current.settings).toHaveLength(2));
    act(() => result.current.setDraftValue('loop.maxRounds', '8'));
    act(() => result.current.setDraftValue('userServers.enabled', false));
    expect(result.current.isDirty).toBe(true);
    act(() => result.current.save());
    await waitFor(() =>
      expect(repo.updateSettings).toHaveBeenCalledWith({
        values: { 'loop.maxRounds': 8, 'userServers.enabled': false },
      }),
    );
    await waitFor(() => expect(result.current.saved).toBe(true));
  });

  it('blocks a save with an invalid value and shows the error', async () => {
    const { result } = render(() => useAdminPluginSettings());
    await waitFor(() => expect(result.current.settings).toHaveLength(2));
    act(() => result.current.setDraftValue('loop.maxRounds', '500'));
    act(() => result.current.save());
    expect(repo.updateSettings).not.toHaveBeenCalled();
    expect(result.current.errors['loop.maxRounds']).toBe('pluginsInstall.validation.range');
  });

  it('discards edits on reset and clears the saved note on the next edit', async () => {
    const { result } = render(() => useAdminPluginSettings());
    await waitFor(() => expect(result.current.settings).toHaveLength(2));
    act(() => result.current.setDraftValue('loop.maxRounds', '9'));
    act(() => result.current.reset());
    expect(result.current.draft['loop.maxRounds']).toBe('5');
    expect(result.current.isDirty).toBe(false);
  });

  it('maps a save failure and a load failure', async () => {
    repo.updateSettings.mockRejectedValue(new ApiClientError({ message: 'x', status: 500 }));
    const { result } = render(() => useAdminPluginSettings());
    await waitFor(() => expect(result.current.settings).toHaveLength(2));
    act(() => result.current.setDraftValue('loop.maxRounds', '6'));
    act(() => result.current.save());
    await waitFor(() => expect(result.current.errorMessage).toBe('pluginsInstall.errors.generic'));

    repo.listSettings.mockRejectedValueOnce(new Error('down'));
    const failing = render(() => useAdminPluginSettings());
    await waitFor(() => expect(failing.result.current.isError).toBe(true));
    repo.listSettings.mockResolvedValue(SETTINGS);
    act(() => failing.result.current.retry());
    await waitFor(() => expect(failing.result.current.settings).toHaveLength(2));
  });
});

describe('useAdminPluginsPage', () => {
  it('starts on the catalog tab and switches', () => {
    const { result } = render(() => useAdminPluginsPage());
    expect(result.current.tab).toBe(AdminPluginsTab.Catalog);
    act(() => result.current.setTab(AdminPluginsTab.Settings));
    expect(result.current.tab).toBe(AdminPluginsTab.Settings);
  });
});
