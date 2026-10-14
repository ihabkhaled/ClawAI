import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginServerStatusBadge } from '@/components/plugins/plugin-server-status-badge';
import { PluginServersPage } from '@/components/plugins/plugin-servers-page';
import { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';
import { PluginServerAuthKind } from '@/enums/plugin-server-auth-kind.enum';
import { pluginServersRepository } from '@/repositories/plugins/plugin-servers.repository';
import { ApiClientError } from '@/services/shared/api-client';
import type { PluginServerList } from '@/types/plugin-servers.types';

import { tStub } from './plugins-fixtures';

const mocks = vi.hoisted(() => ({ toast: vi.fn() }));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: tStub, locale: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('@/repositories/plugins/plugin-servers.repository', () => ({
  pluginServersRepository: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    discover: vi.fn(),
  },
}));

const repo = vi.mocked(pluginServersRepository);

function server(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: `Server ${id}`,
    url: `https://${id}.example.com/mcp`,
    status: 'APPROVED',
    enabled: true,
    hasCredential: false,
    tools: [],
    toolCount: 2,
    ...overrides,
  };
}

function list(servers: ReturnType<typeof server>[], limit: PluginServerList['limit']) {
  repo.list.mockResolvedValue({ servers, limit });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PluginServersPage />
    </QueryClientProvider>,
  );
}

function refusal(code: string, status: number) {
  return new ApiClientError({ message: 'no', status, code });
}

describe('PluginServerStatusBadge', () => {
  it('labels a known status and shows an unknown one as sent', () => {
    const { rerender } = render(<PluginServerStatusBadge status="NEEDS_REVIEW" t={tStub} />);
    expect(screen.getByTestId('plugin-server-status')).toHaveTextContent(
      'pluginsServers.status.needsReview',
    );
    rerender(<PluginServerStatusBadge status="BRAND_NEW" t={tStub} />);
    expect(screen.getByTestId('plugin-server-status')).toHaveTextContent('BRAND_NEW');
  });
});

describe('PluginServersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the loading skeleton, then the list with status badges and the "2 of 5" cap', async () => {
    list([server('a'), server('b', { status: 'UNREACHABLE', hasCredential: true })], 5);
    renderPage();
    expect(screen.getByRole('status', { name: 'pluginsServers.loading' })).toBeInTheDocument();
    expect(await screen.findByText('Server a')).toBeInTheDocument();
    expect(screen.getByTestId('plugin-server-cap')).toHaveTextContent(
      'pluginsServers.cap.used|2,5',
    );
    expect(screen.getAllByTestId('plugin-server-status').map((node) => node.textContent)).toEqual([
      'pluginsServers.status.approved',
      'pluginsServers.status.unreachable',
    ]);
    expect(screen.getByText('pluginsServers.card.keySaved')).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    list([], null);
    renderPage();
    expect(await screen.findByText('pluginsServers.emptyTitle')).toBeInTheDocument();
    expect(screen.getByTestId('plugin-server-cap')).toHaveTextContent(
      'pluginsServers.cap.unlimited',
    );
  });

  it('shows an error with a retry that loads again', async () => {
    repo.list.mockRejectedValueOnce(new Error('down'));
    list([server('a')], null);
    renderPage();
    expect(await screen.findByText('pluginsServers.errorTitle')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(await screen.findByText('Server a')).toBeInTheDocument();
  });

  it('a cap of 0 disables Add and says the plan has none', async () => {
    list([], 0);
    renderPage();
    expect(await screen.findByText('pluginsServers.planNone')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pluginsServers.add/ })).toBeDisabled();
    expect(screen.getByTestId('plugin-server-cap')).toHaveTextContent(
      'pluginsServers.cap.disabled',
    );
  });

  it('disables Add at the limit and warns', async () => {
    list([server('a'), server('b')], 2);
    renderPage();
    expect(await screen.findByText('Server a')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pluginsServers.add/ })).toBeDisabled();
    expect(screen.getByText('pluginsServers.errors.limitReached')).toBeInTheDocument();
  });

  it('shows no cap and does not block Add when the server states none', async () => {
    repo.list.mockResolvedValue({ servers: [], limit: undefined });
    renderPage();
    expect(await screen.findByText('pluginsServers.emptyTitle')).toBeInTheDocument();
    expect(screen.queryByTestId('plugin-server-cap')).toBeNull();
    expect(screen.getByRole('button', { name: /pluginsServers.add/ })).toBeEnabled();
  });

  it('switches a server off with PATCH', async () => {
    list([server('a')], 5);
    repo.update.mockResolvedValue(undefined);
    renderPage();
    fireEvent.click(await screen.findByRole('switch'));
    await waitFor(() => {
      expect(repo.update).toHaveBeenCalledWith('a', { enabled: false });
    });
  });

  it('removes only after the confirm, then refreshes the list', async () => {
    list([server('a')], 5);
    repo.remove.mockResolvedValue(undefined);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /pluginsServers.card.remove/ }));
    expect(repo.remove).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('pluginsServers.remove.description|Server a'),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'pluginsServers.remove.confirm' }));
    await waitFor(() => {
      expect(repo.remove).toHaveBeenCalledWith('a');
    });
    await waitFor(() => {
      expect(repo.list).toHaveBeenCalledTimes(2);
    });
    expect(mocks.toast).toHaveBeenCalled();
  });

  it('shows a removal failure inline', async () => {
    list([server('a')], 5);
    repo.remove.mockRejectedValue(refusal('PLUGIN_SERVER_NOT_FOUND', 404));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /pluginsServers.card.remove/ }));
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'pluginsServers.remove.confirm',
      }),
    );
    expect(await screen.findByText('pluginsServers.errors.notFound')).toBeInTheDocument();
  });

  it('opens the tools dialog, discovers, toggles a tool and saves the choice', async () => {
    list([server('a')], 5);
    repo.discover.mockResolvedValue([
      {
        name: 'search',
        description: 'Find things',
        riskLevel: PluginRiskLevel.Write,
        enabled: false,
      },
      { name: 'read_page', description: 'Read', riskLevel: PluginRiskLevel.Read, enabled: true },
    ]);
    repo.update.mockResolvedValue(undefined);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /pluginsServers.card.tools/ }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('search')).toBeInTheDocument();
    expect(repo.discover).toHaveBeenCalledWith('a');
    expect(within(dialog).getAllByTestId('plugin-risk-badge')).toHaveLength(2);
    fireEvent.click(
      within(dialog).getByRole('switch', { name: 'pluginsServers.tools.enableLabel|search' }),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: /pluginsServers.tools.save/ }));
    await waitFor(() => {
      expect(repo.update).toHaveBeenCalledWith('a', {
        tools: [
          { name: 'search', enabled: true, riskLevel: PluginRiskLevel.Write },
          { name: 'read_page', enabled: true, riskLevel: PluginRiskLevel.Read },
        ],
      });
    });
  });

  it('shows a discovery failure in the tools dialog', async () => {
    list([server('a')], 5);
    repo.discover.mockRejectedValue(refusal('PLUGIN_SERVER_UNREACHABLE', 502));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /pluginsServers.card.tools/ }));
    expect(await screen.findByText('pluginsServers.errors.unreachable')).toBeInTheDocument();
  });
});

describe('Add server dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list([], 5);
  });

  async function openDialog() {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /pluginsServers.add/ }));
    return screen.findByRole('dialog');
  }

  function fill(dialog: HTMLElement, url = 'https://mcp.example.com/mcp') {
    fireEvent.change(within(dialog).getByLabelText('pluginsServers.form.nameLabel'), {
      target: { value: 'Team tools' },
    });
    fireEvent.change(within(dialog).getByLabelText('pluginsServers.form.urlLabel'), {
      target: { value: url },
    });
  }

  it('keeps Connect disabled until name, https URL and the risk consent are all given', async () => {
    const dialog = await openDialog();
    const submit = within(dialog).getByRole('button', { name: 'pluginsServers.form.submit' });
    expect(submit).toBeDisabled();
    fill(dialog, 'http://mcp.example.com');
    fireEvent.click(within(dialog).getByRole('checkbox'));
    expect(submit).toBeDisabled();
    fill(dialog);
    expect(submit).toBeEnabled();
    fireEvent.click(within(dialog).getByRole('checkbox'));
    expect(submit).toBeDisabled();
  });

  it('renders the key as a write-only password field', async () => {
    const dialog = await openDialog();
    expect(within(dialog).getByLabelText('pluginsServers.form.keyLabel')).toHaveAttribute(
      'type',
      'password',
    );
  });

  it('sends the consent and the header key once, then moves to the tools step without the key', async () => {
    repo.create.mockResolvedValue({
      ...server('new', { status: 'PENDING_APPROVAL', hasCredential: true }),
    });
    repo.discover.mockResolvedValue([
      { name: 'search', description: 'Find', riskLevel: PluginRiskLevel.Write, enabled: false },
    ]);
    const dialog = await openDialog();
    fill(dialog);
    fireEvent.change(within(dialog).getByLabelText('pluginsServers.form.keyLabel'), {
      target: { value: 'sk-test-123' },
    });
    fireEvent.click(within(dialog).getByRole('checkbox'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'pluginsServers.form.submit' }));
    await waitFor(() => {
      expect(repo.create).toHaveBeenCalledWith({
        name: 'Team tools',
        url: 'https://mcp.example.com/mcp',
        authKind: PluginServerAuthKind.ApiKey,
        credential: { headerName: 'Authorization', value: 'sk-test-123' },
        acknowledgedRisk: true,
      });
    });
    expect(await within(dialog).findByText('search')).toBeInTheDocument();
    expect(repo.discover).toHaveBeenCalledWith('new');
    expect(screen.queryByDisplayValue('sk-test-123')).toBeNull();
    expect(within(dialog).getByText('pluginsServers.tools.warning')).toBeInTheDocument();
  });

  it('explains an SSRF-refused URL and stays on the form', async () => {
    repo.create.mockRejectedValue(refusal('PLUGIN_SERVER_URL_REFUSED', 422));
    const dialog = await openDialog();
    fill(dialog, 'https://10.0.0.5/mcp');
    fireEvent.click(within(dialog).getByRole('checkbox'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'pluginsServers.form.submit' }));
    expect(await within(dialog).findByText('pluginsServers.errors.urlRefused')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('pluginsServers.form.urlLabel')).toHaveValue(
      'https://10.0.0.5/mcp',
    );
  });

  it('explains a plan limit reached on create', async () => {
    repo.create.mockRejectedValue(refusal('PLUGIN_SERVER_LIMIT_REACHED', 403));
    const dialog = await openDialog();
    fill(dialog);
    fireEvent.click(within(dialog).getByRole('checkbox'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'pluginsServers.form.submit' }));
    expect(
      await within(dialog).findByText('pluginsServers.errors.limitReached'),
    ).toBeInTheDocument();
  });

  it('closes when the backend answers with nothing to show', async () => {
    repo.create.mockResolvedValue(undefined);
    const dialog = await openDialog();
    fill(dialog);
    fireEvent.click(within(dialog).getByRole('checkbox'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'pluginsServers.form.submit' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
