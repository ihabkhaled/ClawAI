import type { PluginAdminCatalogEntryView, PluginSettingView } from '@claw/shared-types';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminPluginCatalogRow } from '@/components/admin/plugins/admin-plugin-catalog-row';
import { AdminPluginCatalogTab } from '@/components/admin/plugins/admin-plugin-catalog-tab';
import { AdminPluginSettingRow } from '@/components/admin/plugins/admin-plugin-setting-row';
import { AdminPluginSettingsTab } from '@/components/admin/plugins/admin-plugin-settings-tab';
import { AdminPluginsPage } from '@/components/admin/plugins/admin-plugins-page';
import { AdminPluginsTab } from '@/enums/admin-plugins-tab.enum';
import { useAdminPluginsPage } from '@/hooks/plugins/use-admin-plugins-page';
import type {
  UseAdminPluginCatalogReturn,
  UseAdminPluginSettingsReturn,
  UseAdminPluginsPageReturn,
} from '@/types/plugin-installs.types';

import { tStub } from '../../../plugins/__tests__/plugins-fixtures';

vi.mock('@/hooks/plugins/use-admin-plugins-page');

const mockPage = vi.mocked(useAdminPluginsPage);

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
  tools: [
    { name: 'fetch_page', riskLevel: 'READ', disabledByAdmin: false },
    { name: 'post_page', riskLevel: 'WRITE', disabledByAdmin: true },
  ],
};

function catalogState(
  overrides: Partial<UseAdminPluginCatalogReturn> = {},
): UseAdminPluginCatalogReturn {
  return {
    entries: [ENTRY],
    isLoading: false,
    isError: false,
    retry: () => undefined,
    pendingSlug: null,
    setGloballyEnabled: () => undefined,
    setFeatured: () => undefined,
    setToolDisabled: () => undefined,
    errorMessage: null,
    ...overrides,
  };
}

function settingsState(
  overrides: Partial<UseAdminPluginSettingsReturn> = {},
): UseAdminPluginSettingsReturn {
  return {
    settings: [
      { key: 'userServers.enabled', value: true, updatedAt: null },
      { key: 'loop.maxRounds', value: 5, updatedAt: null },
      { key: 'custom.unknown', value: 9, updatedAt: null },
    ],
    draft: { 'userServers.enabled': true, 'loop.maxRounds': '5', 'custom.unknown': '9' },
    errors: {},
    setDraftValue: () => undefined,
    isLoading: false,
    isError: false,
    retry: () => undefined,
    isDirty: false,
    isSaving: false,
    save: () => undefined,
    reset: () => undefined,
    errorMessage: null,
    saved: false,
    ...overrides,
  };
}

function pageState(overrides: Partial<UseAdminPluginsPageReturn> = {}): UseAdminPluginsPageReturn {
  return {
    t: tStub,
    tab: AdminPluginsTab.Catalog,
    setTab: () => undefined,
    catalog: catalogState(),
    settings: settingsState(),
    ...overrides,
  };
}

describe('AdminPluginCatalogRow', () => {
  const handlers = () => ({
    onGloballyEnabled: vi.fn(),
    onFeatured: vi.fn(),
    onToolDisabled: vi.fn(),
  });

  it('shows the entry, its installs and its tools with their risk', () => {
    render(<AdminPluginCatalogRow entry={ENTRY} busy={false} t={tStub} {...handlers()} />);
    expect(screen.getByText('Web fetch')).toBeTruthy();
    expect(screen.getByText('pluginsStatus.catalogStatus.PUBLISHED')).toBeTruthy();
    expect(screen.getByText('pluginQa.count.installs.other|3')).toBeTruthy();
    expect(screen.getByText('fetch_page')).toBeTruthy();
    expect(screen.getByText('plugins.risk.write')).toBeTruthy();
  });

  it('flips the global kill switch and featured', () => {
    const h = handlers();
    render(<AdminPluginCatalogRow entry={ENTRY} busy={false} t={tStub} {...h} />);
    fireEvent.click(
      screen.getByRole('switch', { name: 'pluginsInstall.admin.globallyEnabledFor|Web fetch' }),
    );
    expect(h.onGloballyEnabled).toHaveBeenCalledWith('web-fetch', false);
    fireEvent.click(
      screen.getByRole('switch', { name: 'pluginsInstall.admin.featuredFor|Web fetch' }),
    );
    expect(h.onFeatured).toHaveBeenCalledWith('web-fetch', true);
  });

  it('turns a tool off and back on, with the switch showing enabled as on', () => {
    const h = handlers();
    render(<AdminPluginCatalogRow entry={ENTRY} busy={false} t={tStub} {...h} />);
    const fetch = screen.getByRole('switch', {
      name: 'pluginsInstall.admin.toolEnabledFor|fetch_page',
    });
    const post = screen.getByRole('switch', {
      name: 'pluginsInstall.admin.toolEnabledFor|post_page',
    });
    expect(fetch.getAttribute('aria-checked')).toBe('true');
    expect(post.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(fetch);
    expect(h.onToolDisabled).toHaveBeenCalledWith('web-fetch', 'fetch_page', true);
    fireEvent.click(post);
    expect(h.onToolDisabled).toHaveBeenCalledWith('web-fetch', 'post_page', false);
  });

  it('disables every switch while busy', () => {
    render(<AdminPluginCatalogRow entry={ENTRY} busy t={tStub} {...handlers()} />);
    for (const toggle of screen.getAllByRole('switch')) {
      expect(toggle).toBeDisabled();
    }
  });
});

describe('AdminPluginCatalogTab', () => {
  it('shows skeletons while loading', () => {
    render(
      <AdminPluginCatalogTab catalog={catalogState({ isLoading: true, entries: [] })} t={tStub} />,
    );
    expect(screen.getByRole('status', { name: 'plugins.loading' })).toBeTruthy();
  });

  it('shows an error with retry', () => {
    const retry = vi.fn();
    render(<AdminPluginCatalogTab catalog={catalogState({ isError: true, retry })} t={tStub} />);
    expect(screen.getByText('pluginsInstall.admin.errorTitle')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state', () => {
    render(<AdminPluginCatalogTab catalog={catalogState({ entries: [] })} t={tStub} />);
    expect(screen.getByText('pluginsInstall.admin.empty')).toBeTruthy();
  });

  it('lists entries, disables only the busy one, and shows a change error', () => {
    const other = { ...ENTRY, slug: 'weather', name: 'Weather' };
    const setGloballyEnabled = vi.fn();
    render(
      <AdminPluginCatalogTab
        catalog={catalogState({
          entries: [ENTRY, other],
          pendingSlug: 'weather',
          errorMessage: 'Could not save',
          setGloballyEnabled,
        })}
        t={tStub}
      />,
    );
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Could not save')).toBeTruthy();
    expect(
      screen.getByRole('switch', { name: 'pluginsInstall.admin.globallyEnabledFor|Weather' }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole('switch', { name: 'pluginsInstall.admin.globallyEnabledFor|Web fetch' }),
    );
    expect(setGloballyEnabled).toHaveBeenCalledWith('web-fetch', false);
  });
});

describe('AdminPluginSettingRow', () => {
  const flag: PluginSettingView = { key: 'userServers.enabled', value: true, updatedAt: null };
  const rounds: PluginSettingView = { key: 'loop.maxRounds', value: 5, updatedAt: null };
  const unknown: PluginSettingView = { key: 'custom.unknown', value: 9, updatedAt: null };

  it('draws a flag as a switch with its translated label and reports changes', () => {
    const onChange = vi.fn();
    render(
      <AdminPluginSettingRow
        setting={flag}
        value
        error={undefined}
        onChange={onChange}
        t={tStub}
      />,
    );
    expect(screen.getByText('pluginsInstall.admin.setting.userServersEnabled')).toBeTruthy();
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith('userServers.enabled', false);
  });

  it('draws a limit as a bounded number input', () => {
    const onChange = vi.fn();
    render(
      <AdminPluginSettingRow
        setting={rounds}
        value="5"
        error={undefined}
        onChange={onChange}
        t={tStub}
      />,
    );
    const input = screen.getByLabelText('pluginsInstall.admin.setting.loopMaxRounds');
    expect(input.getAttribute('min')).toBe('1');
    expect(input.getAttribute('max')).toBe('10');
    fireEvent.change(input, { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith('loop.maxRounds', '7');
  });

  it('falls back to the raw key and default bounds for a setting it does not know', () => {
    render(
      <AdminPluginSettingRow
        setting={unknown}
        value="9"
        error={undefined}
        onChange={() => undefined}
        t={tStub}
      />,
    );
    const input = screen.getByLabelText('custom.unknown', { selector: 'input' });
    expect(input.getAttribute('min')).toBe('1');
    expect(input.getAttribute('max')).toBe('100000000');
  });

  it('shows an error tied to the input, and an empty value for a boolean draft on a number', () => {
    render(
      <AdminPluginSettingRow
        setting={rounds}
        value
        error="pluginsInstall.validation.range"
        onChange={() => undefined}
        t={tStub}
      />,
    );
    const input = screen.getByLabelText('pluginsInstall.admin.setting.loopMaxRounds');
    expect((input as HTMLInputElement).value).toBe('');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('pluginsInstall.validation.range|1,10');
  });
});

describe('AdminPluginSettingsTab', () => {
  it('shows loading and error states', () => {
    const retry = vi.fn();
    const { rerender } = render(
      <AdminPluginSettingsTab settings={settingsState({ isLoading: true })} t={tStub} />,
    );
    expect(screen.getByRole('status', { name: 'plugins.loading' })).toBeTruthy();
    rerender(
      <AdminPluginSettingsTab settings={settingsState({ isError: true, retry })} t={tStub} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('disables Save and Reset until something changed', () => {
    render(<AdminPluginSettingsTab settings={settingsState()} t={tStub} />);
    expect(screen.getByRole('button', { name: 'pluginsInstall.admin.save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'pluginsInstall.admin.reset' })).toBeDisabled();
  });

  it('saves and resets when dirty, and shows the saved and error notes', () => {
    const save = vi.fn();
    const reset = vi.fn();
    render(
      <AdminPluginSettingsTab
        settings={settingsState({ isDirty: true, save, reset, saved: true, errorMessage: 'Nope' })}
        t={tStub}
      />,
    );
    expect(screen.getByText('pluginsInstall.admin.saved')).toBeTruthy();
    expect(screen.getByText('Nope')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'pluginsInstall.admin.save' }));
    fireEvent.click(screen.getByRole('button', { name: 'pluginsInstall.admin.reset' }));
    expect(save).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('disables Save while saving and passes per-field errors through', () => {
    render(
      <AdminPluginSettingsTab
        settings={settingsState({
          isDirty: true,
          isSaving: true,
          errors: { 'loop.maxRounds': 'pluginsInstall.validation.range' },
        })}
        t={tStub}
      />,
    );
    expect(screen.getByRole('button', { name: 'pluginsInstall.admin.save' })).toBeDisabled();
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});

describe('AdminPluginsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the catalog tab first with both tab triggers', () => {
    mockPage.mockReturnValue(pageState());
    render(<AdminPluginsPage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'pluginsInstall.admin.title',
    );
    expect(screen.getByRole('tab', { name: 'pluginsInstall.admin.tabCatalog' })).toBeTruthy();
    expect(screen.getByText('Web fetch')).toBeTruthy();
  });

  it('switches to the settings tab and back through setTab', () => {
    const setTab = vi.fn();
    mockPage.mockReturnValue(pageState({ setTab }));
    render(<AdminPluginsPage />);
    const settings = screen.getByRole('tab', { name: 'pluginsInstall.admin.tabSettings' });
    fireEvent.mouseDown(settings);
    fireEvent.click(settings);
    expect(setTab).toHaveBeenCalledWith(AdminPluginsTab.Settings);
  });

  it('maps an unknown tab value back to the catalog', () => {
    const setTab = vi.fn();
    mockPage.mockReturnValue(pageState({ setTab, tab: AdminPluginsTab.Settings }));
    render(<AdminPluginsPage />);
    const catalog = screen.getByRole('tab', { name: 'pluginsInstall.admin.tabCatalog' });
    fireEvent.mouseDown(catalog);
    fireEvent.click(catalog);
    expect(setTab).toHaveBeenCalledWith(AdminPluginsTab.Catalog);
    expect(screen.getByText('pluginsInstall.admin.setting.userServersEnabled')).toBeTruthy();
  });
});
