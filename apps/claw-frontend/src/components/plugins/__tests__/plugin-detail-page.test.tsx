import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginDetailPage } from '@/components/plugins/plugin-detail-page';
import { PluginPermissions } from '@/components/plugins/plugin-permissions';
import { PluginToolList } from '@/components/plugins/plugin-tool-list';
import { PluginAuthKind } from '@/enums/plugin-auth-kind.enum';
import { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';
import { usePluginDetail } from '@/hooks/plugins/use-plugin-detail';
import type { UsePluginDetailReturn } from '@/types/plugins.types';

import { pluginDetail, tStub } from './plugins-fixtures';

vi.mock('@/hooks/plugins/use-plugin-detail');
vi.mock('@/components/plugins/plugin-install-panel', () => ({
  PluginInstallPanel: () => <div data-testid="install-panel" />,
}));

const mockDetail = vi.mocked(usePluginDetail);

function state(overrides: Partial<UsePluginDetailReturn> = {}): UsePluginDetailReturn {
  return {
    t: tStub,
    plugin: pluginDetail(),
    isLoading: false,
    isNotFound: false,
    isError: false,
    retry: () => undefined,
    ...overrides,
  };
}

describe('PluginDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the loading skeleton with a back link', () => {
    mockDetail.mockReturnValue(state({ plugin: undefined, isLoading: true }));
    render(<PluginDetailPage slug="web-fetch" />);
    expect(screen.getByRole('status', { name: 'plugins.loading' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /plugins.detail.back/ }).getAttribute('href')).toBe(
      '/plugins',
    );
  });

  it('shows not found for a missing slug', () => {
    mockDetail.mockReturnValue(state({ plugin: undefined, isNotFound: true }));
    render(<PluginDetailPage slug="nope" />);
    expect(screen.getByText('plugins.detail.notFoundTitle')).toBeTruthy();
  });

  it('shows an error with retry', () => {
    const retry = vi.fn();
    mockDetail.mockReturnValue(state({ plugin: undefined, isError: true, retry }));
    render(<PluginDetailPage slug="web-fetch" />);
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows an error when there is no data and no flag set', () => {
    mockDetail.mockReturnValue(state({ plugin: undefined }));
    render(<PluginDetailPage slug="web-fetch" />);
    expect(screen.getByText('plugins.errorTitle')).toBeTruthy();
  });

  it('shows the plugin, its tools, its permissions and the install panel', () => {
    mockDetail.mockReturnValue(state());
    render(<PluginDetailPage slug="web-fetch" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Web fetch' })).toBeTruthy();
    expect(screen.getByText('Fetch a public URL and return readable text.')).toBeTruthy();
    expect(screen.getByText('Fetch a web page')).toBeTruthy();
    expect(screen.getByText('plugins.detail.toolsTitle|1')).toBeTruthy();
    expect(screen.getByText('example.com')).toBeTruthy();
    expect(screen.getByTestId('install-panel')).toBeTruthy();
  });
});

describe('PluginToolList', () => {
  it('shows an empty note when there are no tools', () => {
    render(<PluginToolList tools={[]} t={tStub} />);
    expect(screen.getByText('plugins.detail.toolsEmpty')).toBeTruthy();
  });

  it('shows each tool with its risk', () => {
    render(
      <PluginToolList
        t={tStub}
        tools={[{ name: 'a_tool', title: 'A', description: 'd', riskLevel: PluginRiskLevel.Write }]}
      />,
    );
    expect(screen.getByText('a_tool')).toBeTruthy();
    expect(screen.getByText('plugins.risk.write')).toBeTruthy();
  });
});

describe('PluginPermissions', () => {
  it('says there is no network access and lists all three risk levels', () => {
    render(
      <PluginPermissions
        plugin={pluginDetail({ network: { hosts: [], publicWeb: false } })}
        t={tStub}
      />,
    );
    expect(screen.getByText('plugins.detail.networkNone')).toBeTruthy();
    expect(screen.queryByText('plugins.detail.networkPublicWeb')).toBeNull();
    expect(screen.getByText('plugins.auth.none')).toBeTruthy();
    expect(screen.getByText('plugins.risk.readHint')).toBeTruthy();
    expect(screen.getByText('plugins.risk.writeHint')).toBeTruthy();
    expect(screen.getByText('plugins.risk.destructiveHint')).toBeTruthy();
    expect(screen.queryByText('plugins.detail.scopesTitle')).toBeNull();
  });

  it('says any public website for the web fetch plugin, never no internet', () => {
    render(
      <PluginPermissions
        plugin={pluginDetail({ network: { hosts: [], publicWeb: true } })}
        t={tStub}
      />,
    );
    expect(screen.getByText('plugins.detail.networkPublicWeb')).toBeTruthy();
    expect(screen.queryByText('plugins.detail.networkNone')).toBeNull();
  });

  it('lists fixed hosts and no none text', () => {
    render(<PluginPermissions plugin={pluginDetail()} t={tStub} />);
    expect(screen.getByText('example.com')).toBeTruthy();
    expect(screen.queryByText('plugins.detail.networkNone')).toBeNull();
    expect(screen.queryByText('plugins.detail.networkPublicWeb')).toBeNull();
  });

  it('lists scopes given as strings or objects', () => {
    render(
      <PluginPermissions
        t={tStub}
        plugin={pluginDetail({
          auth: {
            kind: PluginAuthKind.OAuth2Pkce,
            scopes: [
              'read',
              { id: 'write', description: 'Create items' },
              { id: 'x', description: '' },
            ],
          },
        })}
      />,
    );
    expect(screen.getByText('plugins.auth.oauth')).toBeTruthy();
    expect(screen.getByText('plugins.detail.scopesTitle')).toBeTruthy();
    expect(screen.getByText('read')).toBeTruthy();
    expect(screen.getByText(/Create items/)).toBeTruthy();
  });
});
