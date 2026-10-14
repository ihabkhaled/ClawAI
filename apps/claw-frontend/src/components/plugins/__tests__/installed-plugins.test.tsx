import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InstalledPluginCard } from '@/components/plugins/installed-plugin-card';
import { InstalledPluginsPage } from '@/components/plugins/installed-plugins-page';
import { PluginUninstallDialog } from '@/components/plugins/plugin-uninstall-dialog';
import { useInstalledPlugins } from '@/hooks/plugins/use-installed-plugins';
import type { UseInstalledPluginsReturn } from '@/types/plugin-installs.types';

import { installView, tStub } from './plugins-fixtures';

vi.mock('@/hooks/plugins/use-installed-plugins');
vi.mock('@/components/plugins/plugin-chat-grants-list', () => ({
  PluginChatGrantsList: () => null,
}));
vi.mock('@/components/plugins/plugin-settings-sheet', () => ({
  PluginSettingsSheet: ({
    install,
    onClose,
  }: {
    install: { name: string };
    onClose: () => void;
  }) => (
    <div data-testid="settings-sheet">
      {install.name}
      <button type="button" onClick={onClose}>
        close-sheet
      </button>
    </div>
  ),
}));

const mockInstalled = vi.mocked(useInstalledPlugins);

function pageState(overrides: Partial<UseInstalledPluginsReturn> = {}): UseInstalledPluginsReturn {
  return {
    t: tStub,
    installs: [installView()],
    isLoading: false,
    isError: false,
    retry: () => undefined,
    settingsFor: undefined,
    openSettings: () => undefined,
    closeSettings: () => undefined,
    uninstallFor: undefined,
    askUninstall: () => undefined,
    cancelUninstall: () => undefined,
    confirmUninstall: () => undefined,
    isUninstalling: false,
    pendingId: null,
    setEnabled: () => undefined,
    errorMessage: null,
    ...overrides,
  };
}

describe('InstalledPluginCard', () => {
  const handlers = () => ({ onToggle: vi.fn(), onSettings: vi.fn(), onUninstall: vi.fn() });

  it('shows the name, version and state, and toggles through the switch', () => {
    const h = handlers();
    const install = installView();
    render(<InstalledPluginCard install={install} isPending={false} t={tStub} {...h} />);
    expect(screen.getByRole('link', { name: 'Web fetch' }).getAttribute('href')).toBe(
      '/plugins/web-fetch',
    );
    expect(screen.getByText('plugins.detail.version|1.0.0')).toBeTruthy();
    expect(screen.getByText('pluginsInstall.state.enabled')).toBeTruthy();
    const toggle = screen.getByRole('switch', {
      name: 'pluginsInstall.installed.enabledLabel|Web fetch',
    });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    expect(h.onToggle).toHaveBeenCalledWith(install, false);
  });

  it('opens settings and asks to uninstall', () => {
    const h = handlers();
    const install = installView();
    render(<InstalledPluginCard install={install} isPending={false} t={tStub} {...h} />);
    fireEvent.click(screen.getByRole('button', { name: 'pluginsInstall.installed.settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'pluginsInstall.installed.uninstall' }));
    expect(h.onSettings).toHaveBeenCalledWith(install);
    expect(h.onUninstall).toHaveBeenCalledWith(install);
  });

  it('shows an unavailable plugin as off-limits with a reason, and cannot be switched', () => {
    const h = handlers();
    render(
      <InstalledPluginCard
        install={installView({ state: 'UNAVAILABLE' })}
        isPending={false}
        t={tStub}
        {...h}
      />,
    );
    expect(screen.getByText('pluginsInstall.state.unavailable')).toBeTruthy();
    expect(screen.getByText('pluginsInstall.installed.unavailableHelp')).toBeTruthy();
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'pluginsInstall.installed.uninstall' }),
    ).toBeEnabled();
  });

  it('disables the switch while a change is pending and shows off for a disabled install', () => {
    const h = handlers();
    render(
      <InstalledPluginCard
        install={installView({ state: 'DISABLED' })}
        isPending
        t={tStub}
        {...h}
      />,
    );
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('pluginsInstall.state.disabled')).toBeTruthy();
  });

  it('shows the key state for an API-key plugin and an update badge', () => {
    const h = handlers();
    const { rerender } = render(
      <InstalledPluginCard
        install={installView({ authKind: 'API_KEY', latestVersion: '1.1.0' })}
        isPending={false}
        t={tStub}
        {...h}
      />,
    );
    expect(screen.getByText('pluginsInstall.credential.notSet')).toBeTruthy();
    expect(screen.getByText('pluginsInstall.installed.updateAvailable|1.1.0')).toBeTruthy();
    rerender(
      <InstalledPluginCard
        install={installView({
          authKind: 'API_KEY',
          credential: { hasCredential: true, kind: 'API_KEY', updatedAt: null },
          latestVersion: '1.0.0',
        })}
        isPending={false}
        t={tStub}
        {...h}
      />,
    );
    expect(screen.getByText('pluginsInstall.credential.saved')).toBeTruthy();
    expect(screen.queryByText(/updateAvailable/)).toBeNull();
  });

  it('shows no key badge for a plugin that takes none', () => {
    const h = handlers();
    render(<InstalledPluginCard install={installView()} isPending={false} t={tStub} {...h} />);
    expect(screen.queryByText('pluginsInstall.credential.notSet')).toBeNull();
  });
});

describe('PluginUninstallDialog', () => {
  it('is closed with no install and open with one', () => {
    const { rerender } = render(
      <PluginUninstallDialog
        install={undefined}
        busy={false}
        onConfirm={() => undefined}
        onCancel={() => undefined}
        t={tStub}
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(
      <PluginUninstallDialog
        install={installView()}
        busy={false}
        onConfirm={() => undefined}
        onCancel={() => undefined}
        t={tStub}
      />,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('pluginsInstall.uninstall.description|Web fetch')).toBeTruthy();
  });

  it('confirms, cancels, and disables confirm while busy', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(
      <PluginUninstallDialog
        install={installView()}
        busy={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
        t={tStub}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'pluginsInstall.uninstall.confirm' }));
    fireEvent.click(screen.getByRole('button', { name: 'pluginsInstall.uninstall.cancel' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    rerender(
      <PluginUninstallDialog
        install={installView()}
        busy
        onConfirm={onConfirm}
        onCancel={onCancel}
        t={tStub}
      />,
    );
    expect(screen.getByRole('button', { name: 'pluginsInstall.uninstall.confirm' })).toBeDisabled();
  });

  it('cancels when Escape closes the dialog', () => {
    const onCancel = vi.fn();
    render(
      <PluginUninstallDialog
        install={installView()}
        busy={false}
        onConfirm={() => undefined}
        onCancel={onCancel}
        t={tStub}
      />,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('InstalledPluginsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows skeletons while loading', () => {
    mockInstalled.mockReturnValue(pageState({ isLoading: true, installs: [] }));
    render(<InstalledPluginsPage />);
    expect(screen.getByRole('status', { name: 'plugins.loading' })).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('shows an error with a working retry', () => {
    const retry = vi.fn();
    mockInstalled.mockReturnValue(pageState({ isError: true, installs: [], retry }));
    render(<InstalledPluginsPage />);
    expect(screen.getByText('pluginsInstall.installed.errorTitle')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state with a link to Discover', () => {
    mockInstalled.mockReturnValue(pageState({ installs: [] }));
    render(<InstalledPluginsPage />);
    expect(screen.getByText('pluginsInstall.installed.emptyTitle')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'pluginsInstall.installed.browse' }).getAttribute('href'),
    ).toBe('/plugins');
  });

  it('lists a card per install and wires the toggle', () => {
    const setEnabled = vi.fn();
    const installs = [installView(), installView({ id: 'i2', slug: 'weather', name: 'Weather' })];
    mockInstalled.mockReturnValue(pageState({ installs, setEnabled, pendingId: 'i2' }));
    render(<InstalledPluginsPage />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    const switches = screen.getAllByRole('switch');
    expect(switches[1]).toBeDisabled();
    fireEvent.click(switches[0] as HTMLElement);
    expect(setEnabled).toHaveBeenCalledWith(installs[0], false);
  });

  it('shows a mutation error above the list', () => {
    mockInstalled.mockReturnValue(pageState({ errorMessage: 'That plugin could not be found.' }));
    render(<InstalledPluginsPage />);
    expect(screen.getByText('That plugin could not be found.')).toBeTruthy();
  });

  it('renders the settings sheet for the selected install and closes it', () => {
    const closeSettings = vi.fn();
    mockInstalled.mockReturnValue(pageState({ settingsFor: installView(), closeSettings }));
    render(<InstalledPluginsPage />);
    expect(screen.getByTestId('settings-sheet').textContent).toContain('Web fetch');
    fireEvent.click(screen.getByRole('button', { name: 'close-sheet' }));
    expect(closeSettings).toHaveBeenCalledTimes(1);
  });

  it('opens the uninstall confirm for the selected install', () => {
    const confirmUninstall = vi.fn();
    mockInstalled.mockReturnValue(pageState({ uninstallFor: installView(), confirmUninstall }));
    render(<InstalledPluginsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'pluginsInstall.uninstall.confirm' }));
    expect(confirmUninstall).toHaveBeenCalledTimes(1);
  });

  it('has the Installed tab as the current page', () => {
    mockInstalled.mockReturnValue(pageState());
    render(<InstalledPluginsPage />);
    expect(
      screen
        .getByRole('link', { name: 'pluginsInstall.nav.installed' })
        .getAttribute('aria-current'),
    ).toBe('page');
  });
});
