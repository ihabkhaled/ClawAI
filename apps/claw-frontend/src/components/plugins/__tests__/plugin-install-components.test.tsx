import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginCredentialInput } from '@/components/plugins/plugin-credential-input';
import { PluginInstallButton } from '@/components/plugins/plugin-install-button';
import { PluginInstallDialog } from '@/components/plugins/plugin-install-dialog';
import { PluginInstallPanel } from '@/components/plugins/plugin-install-panel';
import { PluginsNav } from '@/components/plugins/plugins-nav';
import { PluginAuthKind } from '@/enums/plugin-auth-kind.enum';
import { PluginInstallGateReason } from '@/enums/plugin-install-gate-reason.enum';
import { PluginsNavTab } from '@/enums/plugins-nav-tab.enum';
import { usePluginInstallPanel } from '@/hooks/plugins/use-plugin-install-panel';

import { installView, panelState, pluginDetail, tStub } from './plugins-fixtures';

vi.mock('@/hooks/plugins/use-plugin-install-panel');

const mockPanel = vi.mocked(usePluginInstallPanel);

describe('PluginInstallButton', () => {
  const noop = () => undefined;

  it('offers Install when allowed and opens the dialog on click', () => {
    const onOpen = vi.fn();
    render(
      <PluginInstallButton
        gate={{ reason: PluginInstallGateReason.None, canInstall: true }}
        install={undefined}
        limit={5}
        onOpen={onOpen}
        t={tStub}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'pluginsInstall.install.button' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('button').getAttribute('aria-describedby')).toBeNull();
    expect(document.getElementById('plugin-install-reason')).toBeNull();
  });

  it('says so in its own words when the plugin is installed but the list has not caught up', () => {
    render(
      <PluginInstallButton
        gate={{ reason: PluginInstallGateReason.AlreadyInstalled, canInstall: false }}
        install={undefined}
        limit={5}
        onOpen={noop}
        t={tStub}
      />,
    );
    const button = screen.getByRole('button', { name: 'pluginsInstall.install.button' });
    expect(button).toBeDisabled();
    expect(button.getAttribute('aria-describedby')).toBe('plugin-install-reason');
    expect(screen.getByText(/pluginsStatus.install.alreadyInstalled/)).toBeTruthy();
  });

  it('disables Install at the plan cap and says why, with an upgrade link', () => {
    render(
      <PluginInstallButton
        gate={{ reason: PluginInstallGateReason.LimitReached, canInstall: false }}
        install={undefined}
        limit={5}
        onOpen={noop}
        t={tStub}
      />,
    );
    const button = screen.getByRole('button', { name: 'pluginsInstall.install.button' });
    expect(button).toBeDisabled();
    expect(button.getAttribute('aria-describedby')).toBe('plugin-install-reason');
    expect(screen.getByText(/pluginsInstall.install.limitReached\|5/)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'pluginsInstall.install.upgrade' }).getAttribute('href'),
    ).toBe('/pricing');
  });

  it('explains a plan without plugins with an upgrade link, and does not invent a limit', () => {
    render(
      <PluginInstallButton
        gate={{ reason: PluginInstallGateReason.PlanOff, canInstall: false }}
        install={undefined}
        limit={undefined}
        onOpen={noop}
        t={tStub}
      />,
    );
    expect(screen.getByText(/pluginsInstall.install.planOff/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'pluginsInstall.install.upgrade' })).toBeTruthy();
  });

  it('explains a global disable without an upgrade link', () => {
    render(
      <PluginInstallButton
        gate={{ reason: PluginInstallGateReason.GloballyDisabled, canInstall: false }}
        install={installView({ state: 'UNAVAILABLE' })}
        limit={5}
        onOpen={noop}
        t={tStub}
      />,
    );
    expect(screen.getByText('pluginsInstall.install.globallyDisabled|5')).toBeTruthy();
    expect(screen.getByText('pluginsInstall.state.unavailable')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'pluginsInstall.install.upgrade' })).toBeNull();
  });

  it('shows the install state and a Manage link instead of Install', () => {
    render(
      <PluginInstallButton
        gate={{ reason: PluginInstallGateReason.AlreadyInstalled, canInstall: false }}
        install={installView()}
        limit={5}
        onOpen={noop}
        t={tStub}
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(/pluginsStatus.install.alreadyInstalled/)).toBeNull();
    expect(screen.getByText('pluginsInstall.state.enabled')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'pluginsInstall.install.manage' }).getAttribute('href'),
    ).toBe('/plugins/installed');
  });
});

describe('PluginCredentialInput', () => {
  it('is a password field that reports what is typed and never shows a saved key', () => {
    const onChange = vi.fn();
    render(<PluginCredentialInput id="k" value="" onChange={onChange} hasCredential t={tStub} />);
    const input = screen.getByLabelText('pluginsInstall.credential.label');
    expect(input.getAttribute('type')).toBe('password');
    expect(input.getAttribute('autocomplete')).toBe('new-password');
    expect((input as HTMLInputElement).value).toBe('');
    expect(input.getAttribute('placeholder')).toBe('pluginsInstall.credential.replacePlaceholder');
    expect(screen.getByText('pluginsInstall.credential.saved')).toBeTruthy();
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(onChange).toHaveBeenCalledWith('abc');
  });

  it('says no key is set when there is none', () => {
    render(
      <PluginCredentialInput
        id="k"
        value="typed"
        onChange={() => undefined}
        hasCredential={false}
        t={tStub}
      />,
    );
    expect(screen.getByText('pluginsInstall.credential.notSet')).toBeTruthy();
    expect(
      screen.getByLabelText('pluginsInstall.credential.label').getAttribute('placeholder'),
    ).toBe('pluginsInstall.credential.placeholder');
    expect(
      screen.getByLabelText('pluginsInstall.credential.label').getAttribute('aria-describedby'),
    ).toBe('k-help');
  });
});

describe('PluginInstallDialog', () => {
  const plugin = pluginDetail({
    network: { hosts: ['api.example.com'], publicWeb: true },
    auth: { kind: PluginAuthKind.None, scopes: ['read'] },
  });

  it('is closed until opened', () => {
    render(<PluginInstallDialog plugin={plugin} panel={panelState()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the tools, scopes, hosts and risk levels before confirming', () => {
    const confirm = vi.fn();
    const closeDialog = vi.fn();
    render(
      <PluginInstallDialog
        plugin={plugin}
        panel={panelState({ isOpen: true, confirm, closeDialog })}
      />,
    );
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('pluginsInstall.dialog.title|Web fetch')).toBeTruthy();
    expect(dialog.getByText('Fetch a web page')).toBeTruthy();
    expect(dialog.getByText('api.example.com')).toBeTruthy();
    expect(dialog.getByText('plugins.detail.networkPublicWeb')).toBeTruthy();
    expect(dialog.getByText('read')).toBeTruthy();
    expect(dialog.getAllByText('plugins.risk.read').length).toBeGreaterThan(0);
    expect(dialog.queryByLabelText('pluginsInstall.credential.label')).toBeNull();
    fireEvent.click(dialog.getByRole('button', { name: 'pluginsInstall.dialog.confirm' }));
    expect(confirm).toHaveBeenCalledTimes(1);
    fireEvent.click(dialog.getByRole('button', { name: 'pluginsInstall.dialog.cancel' }));
    expect(closeDialog).toHaveBeenCalledTimes(1);
  });

  it('asks for a key only when the plugin needs one, and disables confirm until it is typed', () => {
    const setCredential = vi.fn();
    render(
      <PluginInstallDialog
        plugin={pluginDetail({ auth: { kind: PluginAuthKind.ApiKey, scopes: [] } })}
        panel={panelState({
          isOpen: true,
          needsCredential: true,
          canConfirm: false,
          setCredential,
        })}
      />,
    );
    const input = screen.getByLabelText('pluginsInstall.credential.label');
    fireEvent.change(input, { target: { value: 'k' } });
    expect(setCredential).toHaveBeenCalledWith('k');
    expect(screen.getByRole('button', { name: 'pluginsInstall.dialog.confirm' })).toBeDisabled();
  });

  it('shows an error and the installing label', () => {
    render(
      <PluginInstallDialog
        plugin={plugin}
        panel={panelState({
          isOpen: true,
          errorMessage: 'No room',
          isInstalling: true,
          canConfirm: false,
        })}
      />,
    );
    expect(screen.getByText('No room')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'pluginsInstall.install.installing' }),
    ).toBeDisabled();
  });
});

describe('PluginInstallPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the button and opens the dialog through the panel state', () => {
    const openDialog = vi.fn();
    mockPanel.mockReturnValue(panelState({ openDialog }));
    render(<PluginInstallPanel plugin={pluginDetail()} />);
    fireEvent.click(screen.getByRole('button', { name: 'pluginsInstall.install.button' }));
    expect(openDialog).toHaveBeenCalledTimes(1);
    expect(mockPanel).toHaveBeenCalledWith(expect.objectContaining({ slug: 'web-fetch' }));
  });
});

describe('PluginsNav', () => {
  it('marks only the active view as current', () => {
    const { rerender } = render(<PluginsNav active={PluginsNavTab.Installed} t={tStub} />);
    expect(
      screen
        .getByRole('link', { name: 'pluginsInstall.nav.installed' })
        .getAttribute('aria-current'),
    ).toBe('page');
    expect(
      screen
        .getByRole('link', { name: 'pluginsInstall.nav.discover' })
        .getAttribute('aria-current'),
    ).toBeNull();
    rerender(<PluginsNav active={PluginsNavTab.Discover} t={tStub} />);
    expect(
      screen
        .getByRole('link', { name: 'pluginsInstall.nav.discover' })
        .getAttribute('aria-current'),
    ).toBe('page');
  });
});
