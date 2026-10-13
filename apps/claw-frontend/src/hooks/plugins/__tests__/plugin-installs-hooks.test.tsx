import type { PluginInstallView } from '@claw/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginAuthKind } from '@/enums/plugin-auth-kind.enum';
import { PluginInstallGateReason } from '@/enums/plugin-install-gate-reason.enum';
import { pluginInstallsRepository } from '@/repositories/plugins/plugin-installs.repository';
import { pluginsRepository } from '@/repositories/plugins/plugins.repository';
import { ApiClientError } from '@/services/shared/api-client';

import { pluginDetail } from '../../../components/plugins/__tests__/plugins-fixtures';
import { useInstalledPlugins } from '../use-installed-plugins';
import { usePluginInstallDialog } from '../use-plugin-install-dialog';
import { usePluginInstallPanel } from '../use-plugin-install-panel';
import { usePluginInstalls } from '../use-plugin-installs';
import { usePluginInvalidation } from '../use-plugin-invalidation';
import { usePluginSettingsSheet } from '../use-plugin-settings-sheet';
import { usePluginToast } from '../use-plugin-toast';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  entitlements: { current: null as unknown },
  planHas: { current: true },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/hooks/plans/use-entitlements', () => ({
  useEntitlements: () => ({ entitlements: mocks.entitlements.current }),
}));
vi.mock('@/hooks/auth/use-plan-features', () => ({
  usePlanFeatures: () => ({ has: () => mocks.planHas.current, isAdmin: false, isLoading: false }),
}));
vi.mock('@/repositories/plugins/plugin-installs.repository', () => ({
  pluginInstallsRepository: {
    list: vi.fn(),
    install: vi.fn(),
    update: vi.fn(),
    uninstall: vi.fn(),
    putCredential: vi.fn(),
    deleteCredential: vi.fn(),
    grantConsent: vi.fn(),
    revokeConsent: vi.fn(),
  },
}));
vi.mock('@/repositories/plugins/plugins.repository', () => ({
  pluginsRepository: { listCatalog: vi.fn(), getCatalogEntry: vi.fn() },
}));

const repo = vi.mocked(pluginInstallsRepository);
const catalog = vi.mocked(pluginsRepository);

function installView(overrides: Partial<PluginInstallView> = {}): PluginInstallView {
  return {
    id: 'i1',
    slug: 'web-fetch',
    name: 'Web fetch',
    iconKey: 'globe',
    version: '1.0.0',
    latestVersion: null,
    state: 'ENABLED',
    authKind: 'NONE',
    settings: {},
    credential: { hasCredential: false, kind: null, updatedAt: null },
    consents: [],
    installedAt: '2026-10-13T00:00:00Z',
    updatedAt: '2026-10-13T00:00:00Z',
    ...overrides,
  };
}

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function render<T>(hook: () => T, client: QueryClient = makeClient()) {
  return renderHook(hook, { wrapper: wrapperFor(client) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.entitlements.current = { plan: { limits: { maxInstalledPlugins: 5 } } };
  mocks.planHas.current = true;
  repo.list.mockResolvedValue([]);
});

describe('usePluginInstalls', () => {
  it('returns the list, and an empty array while loading', async () => {
    repo.list.mockResolvedValue([installView()]);
    const { result } = render(() => usePluginInstalls());
    expect(result.current.installs).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.installs).toHaveLength(1));
  });

  it('reports an error and retries', async () => {
    repo.list.mockRejectedValueOnce(new Error('down'));
    const { result } = render(() => usePluginInstalls());
    await waitFor(() => expect(result.current.isError).toBe(true));
    repo.list.mockResolvedValue([installView()]);
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.installs).toHaveLength(1));
  });
});

describe('usePluginInvalidation', () => {
  it('invalidates installs, mentions, catalog and detail', async () => {
    const client = makeClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = render(() => usePluginInvalidation(), client);
    await act(async () => {
      await result.current();
    });
    const keys = spy.mock.calls.map((call) => call[0]?.queryKey);
    expect(keys).toEqual([
      ['plugins', 'installs'],
      ['plugins', 'mentions'],
      ['plugins', 'catalog'],
      ['plugins', 'detail'],
    ]);
  });
});

describe('installs query key', () => {
  it('is per locale, and the invalidation root reaches it', async () => {
    const client = makeClient();
    repo.list.mockResolvedValue([installView()]);
    const { result } = render(() => usePluginInstalls(), client);
    await waitFor(() => expect(result.current.installs).toHaveLength(1));
    const state = () => client.getQueryState(['plugins', 'installs', 'en']);
    expect(state()?.isInvalidated).toBe(false);
    const invalidation = render(() => usePluginInvalidation(), client);
    await act(async () => {
      await invalidation.result.current();
    });
    expect(repo.list).toHaveBeenCalledTimes(2);
  });
});

describe('usePluginToast', () => {
  it('shows a success toast with the translated key', () => {
    const { result } = render(() => usePluginToast());
    result.current('pluginsInstall.toast.saved');
    expect(mocks.toast).toHaveBeenCalledWith({
      title: 'pluginsInstall.toast.saved',
      variant: 'success',
    });
  });
});

describe('usePluginInstallDialog', () => {
  it('opens, closes and clears the typed key', () => {
    const plugin = pluginDetail({ auth: { kind: PluginAuthKind.ApiKey, scopes: [] } });
    const { result } = render(() => usePluginInstallDialog(plugin));
    act(() => result.current.openDialog());
    act(() => result.current.setCredential('abc'));
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.closeDialog());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.credential).toBe('');
  });

  it('needs a key only for an API-key plugin before it can confirm', () => {
    const keyed = pluginDetail({ auth: { kind: PluginAuthKind.ApiKey, scopes: [] } });
    const { result } = render(() => usePluginInstallDialog(keyed));
    expect(result.current.needsCredential).toBe(true);
    expect(result.current.canConfirm).toBe(false);
    act(() => result.current.setCredential('   '));
    expect(result.current.canConfirm).toBe(false);
    act(() => result.current.setCredential('k-1'));
    expect(result.current.canConfirm).toBe(true);

    const open = render(() => usePluginInstallDialog(pluginDetail()));
    expect(open.result.current.needsCredential).toBe(false);
    expect(open.result.current.canConfirm).toBe(true);
  });

  it('installs with the slug and version, stores a trimmed key, then closes', async () => {
    repo.install.mockResolvedValue(installView({ id: 'new' }));
    repo.putCredential.mockResolvedValue({ hasCredential: true, kind: 'API_KEY', updatedAt: null });
    const keyed = pluginDetail({ auth: { kind: PluginAuthKind.ApiKey, scopes: [] } });
    const { result } = render(() => usePluginInstallDialog(keyed));
    act(() => result.current.openDialog());
    act(() => result.current.setCredential('  k-1  '));
    act(() => result.current.confirm());
    await waitFor(() => expect(result.current.isOpen).toBe(false));
    expect(repo.install).toHaveBeenCalledWith({ slug: 'web-fetch', version: '1.0.0' });
    expect(repo.putCredential).toHaveBeenCalledWith('new', { kind: 'API_KEY', value: 'k-1' });
    expect(result.current.credential).toBe('');
    expect(mocks.toast).toHaveBeenCalled();
  });

  it('keeps the dialog open and maps the error code when the install is refused', async () => {
    repo.install.mockRejectedValue(
      new ApiClientError({ message: 'x', status: 403, code: 'PLUGIN_INSTALL_LIMIT' }),
    );
    const { result } = render(() => usePluginInstallDialog(pluginDetail()));
    act(() => result.current.openDialog());
    act(() => result.current.confirm());
    await waitFor(() => expect(result.current.errorMessage).toBe('pluginsInstall.errors.limit'));
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.closeDialog());
    await waitFor(() => expect(result.current.errorMessage).toBeNull());
  });
});

describe('usePluginInstallDialog when the key call fails after the install', () => {
  it('keeps the dialog open and retries only the key call against the same install', async () => {
    repo.install.mockResolvedValue(installView({ id: 'made' }));
    repo.putCredential.mockRejectedValueOnce(new Error('boom'));
    const keyed = pluginDetail({ auth: { kind: PluginAuthKind.ApiKey, scopes: [] } });
    const { result } = render(() => usePluginInstallDialog(keyed));
    act(() => result.current.openDialog());
    act(() => result.current.setCredential('k-1'));
    act(() => result.current.confirm());
    await waitFor(() =>
      expect(result.current.errorMessage).toBe('pluginsStatus.errors.credentialFailed'),
    );
    expect(result.current.isOpen).toBe(true);
    expect(repo.install).toHaveBeenCalledTimes(1);

    repo.putCredential.mockResolvedValueOnce({
      hasCredential: true,
      kind: 'API_KEY',
      updatedAt: null,
    });
    act(() => result.current.setCredential('k-2'));
    act(() => result.current.confirm());
    await waitFor(() => expect(result.current.isOpen).toBe(false));
    expect(repo.install).toHaveBeenCalledTimes(1);
    expect(repo.putCredential).toHaveBeenLastCalledWith('made', { kind: 'API_KEY', value: 'k-2' });
    expect(mocks.toast).toHaveBeenCalled();
  });

  it('keeps the same message when the retry fails too, and a close resets it', async () => {
    repo.install.mockResolvedValue(installView({ id: 'made' }));
    repo.putCredential.mockRejectedValue(new Error('boom'));
    const keyed = pluginDetail({ auth: { kind: PluginAuthKind.ApiKey, scopes: [] } });
    const { result } = render(() => usePluginInstallDialog(keyed));
    act(() => result.current.openDialog());
    act(() => result.current.setCredential('k-1'));
    act(() => result.current.confirm());
    await waitFor(() =>
      expect(result.current.errorMessage).toBe('pluginsStatus.errors.credentialFailed'),
    );
    act(() => result.current.confirm());
    await waitFor(() => expect(repo.putCredential).toHaveBeenCalledTimes(2));
    expect(result.current.errorMessage).toBe('pluginsStatus.errors.credentialFailed');
    expect(repo.install).toHaveBeenCalledTimes(1);
    act(() => result.current.closeDialog());
    await waitFor(() => expect(result.current.errorMessage).toBeNull());
  });
});

describe('usePluginInstallPanel', () => {
  it('allows an install under the cap', async () => {
    const { result } = render(() => usePluginInstallPanel(pluginDetail()));
    await waitFor(() => expect(repo.list).toHaveBeenCalled());
    expect(result.current.gate.canInstall).toBe(true);
    expect(result.current.limit).toBe(5);
  });

  it('blocks at the cap and says so', async () => {
    repo.list.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => installView({ id: `i${index}`, slug: `p${index}` })),
    );
    const { result } = render(() => usePluginInstallPanel(pluginDetail()));
    await waitFor(() =>
      expect(result.current.gate.reason).toBe(PluginInstallGateReason.LimitReached),
    );
  });

  it('blocks when the plan has no plugins', () => {
    mocks.planHas.current = false;
    const { result } = render(() => usePluginInstallPanel(pluginDetail()));
    expect(result.current.gate.reason).toBe(PluginInstallGateReason.PlanOff);
  });

  it('treats a missing plan as no stated cap, leaving the decision to the server', () => {
    mocks.entitlements.current = null;
    const { result } = render(() => usePluginInstallPanel(pluginDetail()));
    expect(result.current.limit).toBeUndefined();
    expect(result.current.gate.canInstall).toBe(true);
  });

  it('shows the install and an unavailable gate for a globally disabled plugin', async () => {
    repo.list.mockResolvedValue([installView({ state: 'UNAVAILABLE' })]);
    const { result } = render(() => usePluginInstallPanel(pluginDetail()));
    await waitFor(() =>
      expect(result.current.gate.reason).toBe(PluginInstallGateReason.GloballyDisabled),
    );
    expect(result.current.install?.id).toBe('i1');
  });

  it('knows the plugin is installed from the catalog flag alone', () => {
    const { result } = render(() => usePluginInstallPanel(pluginDetail({ installed: true })));
    expect(result.current.gate.reason).toBe(PluginInstallGateReason.AlreadyInstalled);
  });
});

describe('useInstalledPlugins', () => {
  beforeEach(() => {
    repo.list.mockResolvedValue([
      installView(),
      installView({ id: 'i2', slug: 'weather', name: 'Weather' }),
    ]);
  });

  it('toggles an install through the update call', async () => {
    repo.update.mockResolvedValue(installView({ state: 'DISABLED' }));
    const { result } = render(() => useInstalledPlugins());
    await waitFor(() => expect(result.current.installs).toHaveLength(2));
    act(() => result.current.setEnabled(result.current.installs[0] as PluginInstallView, false));
    await waitFor(() => expect(repo.update).toHaveBeenCalledWith('i1', { enabled: false }));
  });

  it('maps an update failure to a message', async () => {
    repo.update.mockRejectedValue(new ApiClientError({ message: 'x', status: 404 }));
    const { result } = render(() => useInstalledPlugins());
    await waitFor(() => expect(result.current.installs).toHaveLength(2));
    act(() => result.current.setEnabled(result.current.installs[0] as PluginInstallView, true));
    await waitFor(() => expect(result.current.errorMessage).toBe('pluginsInstall.errors.notFound'));
  });

  it('asks before uninstalling, cancels, and uninstalls on confirm', async () => {
    repo.uninstall.mockResolvedValue(undefined);
    const { result } = render(() => useInstalledPlugins());
    await waitFor(() => expect(result.current.installs).toHaveLength(2));
    const first = result.current.installs[0] as PluginInstallView;

    act(() => result.current.confirmUninstall());
    expect(repo.uninstall).not.toHaveBeenCalled();

    act(() => result.current.askUninstall(first));
    expect(result.current.uninstallFor?.id).toBe('i1');
    act(() => result.current.cancelUninstall());
    expect(result.current.uninstallFor).toBeUndefined();

    act(() => result.current.askUninstall(first));
    act(() => result.current.confirmUninstall());
    await waitFor(() => expect(repo.uninstall).toHaveBeenCalledWith('i1'));
    await waitFor(() => expect(result.current.uninstallFor).toBeUndefined());
  });

  it('opens and closes the settings sheet by id', async () => {
    const { result } = render(() => useInstalledPlugins());
    await waitFor(() => expect(result.current.installs).toHaveLength(2));
    act(() => result.current.openSettings(result.current.installs[1] as PluginInstallView));
    expect(result.current.settingsFor?.slug).toBe('weather');
    act(() => result.current.closeSettings());
    expect(result.current.settingsFor).toBeUndefined();
  });

  it('exposes the pending id while a toggle is in flight', async () => {
    let release: (value: PluginInstallView) => void = () => undefined;
    repo.update.mockReturnValue(new Promise((resolve) => (release = resolve)));
    const { result } = render(() => useInstalledPlugins());
    await waitFor(() => expect(result.current.installs).toHaveLength(2));
    act(() => result.current.setEnabled(result.current.installs[0] as PluginInstallView, false));
    await waitFor(() => expect(result.current.pendingId).toBe('i1'));
    await act(async () => release(installView()));
    await waitFor(() => expect(result.current.pendingId).toBeNull());
  });
});

describe('usePluginSettingsSheet', () => {
  // Held outside the render callback: a new install object per render would re-seed the draft forever.
  const SHEET_INSTALL = installView();
  const KEYED_INSTALL = installView({ authKind: 'API_KEY' });
  const schema = {
    type: 'object',
    properties: { units: { type: 'string', enum: ['metric', 'imperial'], default: 'metric' } },
  };

  beforeEach(() => {
    catalog.getCatalogEntry.mockResolvedValue(pluginDetail({ settingsSchema: schema, tools: [] }));
  });

  it('builds the form from the schema and saves valid settings', async () => {
    repo.update.mockResolvedValue(installView());
    const { result } = render(() => usePluginSettingsSheet(SHEET_INSTALL));
    await waitFor(() => expect(result.current.fields).toHaveLength(1));
    expect(result.current.draft.units).toBe('metric');
    act(() => result.current.setDraftValue('units', 'imperial'));
    act(() => result.current.save());
    await waitFor(() =>
      expect(repo.update).toHaveBeenCalledWith('i1', { settings: { units: 'imperial' } }),
    );
  });

  it('sends nothing and shows the error when a setting is invalid', async () => {
    const { result } = render(() => usePluginSettingsSheet(SHEET_INSTALL));
    await waitFor(() => expect(result.current.fields).toHaveLength(1));
    act(() => result.current.setDraftValue('units', 'kelvin'));
    act(() => result.current.save());
    expect(repo.update).not.toHaveBeenCalled();
    expect(result.current.errors.units).toBe('pluginsInstall.validation.option');
  });

  it('saves the typed key, clears it, and removes a key', async () => {
    repo.putCredential.mockResolvedValue({ hasCredential: true, kind: 'API_KEY', updatedAt: null });
    repo.deleteCredential.mockResolvedValue(undefined);
    const { result } = render(() => usePluginSettingsSheet(KEYED_INSTALL));
    act(() => result.current.setCredentialDraft('  new-key '));
    act(() => result.current.saveCredential());
    await waitFor(() =>
      expect(repo.putCredential).toHaveBeenCalledWith('i1', { kind: 'API_KEY', value: 'new-key' }),
    );
    await waitFor(() => expect(result.current.credentialDraft).toBe(''));
    act(() => result.current.removeCredential());
    await waitFor(() => expect(repo.deleteCredential).toHaveBeenCalledWith('i1'));
  });

  it('grants and revokes a consent and maps a failure', async () => {
    repo.grantConsent.mockResolvedValue({
      toolName: 'send',
      level: 'WRITE',
      grantedAt: '2026-10-13T00:00:00Z',
    });
    repo.revokeConsent.mockResolvedValue(undefined);
    const { result } = render(() => usePluginSettingsSheet(SHEET_INSTALL));
    act(() => result.current.grantConsent('send', 'WRITE'));
    await waitFor(() =>
      expect(repo.grantConsent).toHaveBeenCalledWith('i1', { toolName: 'send', level: 'WRITE' }),
    );
    act(() => result.current.revokeConsent('send'));
    await waitFor(() => expect(repo.revokeConsent).toHaveBeenCalledWith('i1', 'send'));

    repo.grantConsent.mockRejectedValue(new ApiClientError({ message: 'x', status: 400 }));
    act(() => result.current.grantConsent('other', 'WRITE'));
    await waitFor(() => expect(result.current.errorMessage).toBe('pluginsInstall.errors.generic'));
  });

  it('has no fields until the catalog entry arrives', () => {
    catalog.getCatalogEntry.mockReturnValue(new Promise(() => undefined));
    const { result } = render(() => usePluginSettingsSheet(SHEET_INSTALL));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.fields).toEqual([]);
  });
});
