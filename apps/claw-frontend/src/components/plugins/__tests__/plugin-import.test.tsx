import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginImportPage } from '@/components/plugins/plugin-import-page';
import { PluginImportReview } from '@/components/plugins/plugin-import-review';
import { PluginImportComponentKind } from '@/enums/plugin-import-component-kind.enum';
import { PluginImportPreviewKind } from '@/enums/plugin-import-preview-kind.enum';
import { PluginImportRisk } from '@/enums/plugin-import-risk.enum';
import { PluginImportSupport } from '@/enums/plugin-import-support.enum';
import { pluginImportsRepository } from '@/repositories/plugins/plugin-imports.repository';
import { ApiClientError } from '@/services/shared/api-client';
import type { PluginImportDraft } from '@/types/plugin-import.types';

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
vi.mock('@/repositories/plugins/plugin-imports.repository', () => ({
  pluginImportsRepository: {
    list: vi.fn(),
    previewGithub: vi.fn(),
    previewUpload: vi.fn(),
    confirm: vi.fn(),
    remove: vi.fn(),
  },
}));

const repo = vi.mocked(pluginImportsRepository);

function draft(): PluginImportDraft {
  return {
    draftId: 'draft-1',
    checksum: 'c'.repeat(64),
    source: { kind: 'GITHUB', ref: 'o/r@main', commitSha: 'a'.repeat(40) },
    expiresAt: '2026-10-15T10:30:00Z',
    preview: {
      format: 'CLAUDE',
      name: 'i-have-headache',
      version: '1.2.0',
      description: 'Be concise.',
      author: 'Owner',
      license: 'MIT',
      homepage: '',
      risk: PluginImportRisk.High,
      warnings: ['hooks-not-run', 'something-new'],
      fileCount: 5,
      keptFileCount: 3,
      ignoredFileCount: 2,
      totalBytes: 900,
      components: [
        {
          kind: PluginImportComponentKind.Skill,
          name: 'headache',
          path: 'skills/headache/SKILL.md',
          description: 'Terse mode',
          support: PluginImportSupport.StoredInert,
          reasonKey: 'no-skills-store',
        },
        {
          kind: PluginImportComponentKind.Hook,
          name: 'SessionStart',
          path: 'hooks/hooks.json',
          description: '1',
          support: PluginImportSupport.NotSupported,
          reasonKey: 'hooks',
        },
        {
          kind: PluginImportComponentKind.McpServer,
          name: 'remote',
          path: '.mcp.json',
          description: '',
          support: PluginImportSupport.Usable,
          url: 'https://mcp.example.com/mcp',
        },
      ],
    },
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PluginImportPage />
    </QueryClientProvider>,
  );
}

describe('plugin import review', () => {
  it('shows the source, pinned commit, checksum, every component and its support, and only known warnings', () => {
    render(
      <PluginImportReview
        draft={draft()}
        acknowledged={false}
        setAcknowledged={vi.fn()}
        canInstall={false}
        busy={false}
        onInstall={vi.fn()}
        onDiscard={vi.fn()}
        t={tStub}
      />,
    );

    expect(screen.getByText('o/r@main')).toBeTruthy();
    expect(screen.getByText('aaaaaaaaaaaa')).toBeTruthy();
    expect(screen.getByText('c'.repeat(64))).toBeTruthy();
    expect(screen.getAllByTestId('plugin-import-component')).toHaveLength(3);
    expect(screen.getByText('pluginImport.support.notSupported')).toBeTruthy();
    expect(screen.getByText('pluginImport.reason.hooks')).toBeTruthy();
    expect(screen.getByText('https://mcp.example.com/mcp')).toBeTruthy();
    expect(screen.getByText('pluginImport.warning.hooksNotRun')).toBeTruthy();
    expect(screen.queryByText('something-new')).toBeNull();
    expect(screen.getByRole('button', { name: 'pluginImport.review.install' })).toHaveProperty(
      'disabled',
      true,
    );
  });
});

describe('plugin import page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.list.mockResolvedValue([]);
  });

  it('reads a GitHub source, needs the acknowledgement, then installs the reviewed checksum', async () => {
    repo.previewGithub.mockResolvedValue({ kind: PluginImportPreviewKind.Plugin, draft: draft() });
    repo.confirm.mockResolvedValue({} as never);
    renderPage();

    fireEvent.change(screen.getByLabelText('pluginImport.source.githubLabel'), {
      target: { value: 'o/r' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'pluginImport.source.preview' }));

    const install = await screen.findByRole('button', { name: 'pluginImport.review.install' });
    expect(repo.previewGithub).toHaveBeenCalledWith('o/r', '');
    expect(install).toHaveProperty('disabled', true);

    fireEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => {
      expect(install).toHaveProperty('disabled', false);
    });
    fireEvent.click(install);

    await waitFor(() => {
      expect(repo.confirm).toHaveBeenCalledWith('draft-1', 'c'.repeat(64));
    });
  });

  it('shows a marketplace and reviews the chosen entry from the same source', async () => {
    repo.previewGithub
      .mockResolvedValueOnce({
        kind: PluginImportPreviewKind.Marketplace,
        name: 'market',
        candidates: [{ name: 'one', description: 'First', subdir: 'plugins/one' }],
      })
      .mockResolvedValueOnce({ kind: PluginImportPreviewKind.Plugin, draft: draft() });
    renderPage();

    fireEvent.change(screen.getByLabelText('pluginImport.source.githubLabel'), {
      target: { value: 'o/r' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'pluginImport.source.preview' }));
    fireEvent.click(await screen.findByRole('button', { name: 'pluginImport.marketplace.choose' }));

    await screen.findByText('i-have-headache');
    expect(repo.previewGithub).toHaveBeenLastCalledWith('o/r', 'plugins/one');
  });

  it('turns a service refusal into a translated message', async () => {
    repo.previewGithub.mockRejectedValue(
      new ApiClientError({ message: 'x', status: 422, code: 'PLUGIN_IMPORT_NO_PLUGIN_FOUND' }),
    );
    renderPage();

    fireEvent.change(screen.getByLabelText('pluginImport.source.githubLabel'), {
      target: { value: 'o/r' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'pluginImport.source.preview' }));

    expect(await screen.findByText('pluginImport.errors.noPlugin')).toBeTruthy();
  });

  it('lists imported plugins and removes one', async () => {
    repo.list.mockResolvedValue([
      {
        id: 'p1',
        name: 'Thing',
        version: '1.0.0',
        description: '',
        source: { kind: 'UPLOAD', ref: 'thing.zip', commitSha: null },
        checksum: 'c',
        preview: draft().preview,
        totalBytes: 10,
        fileCount: 3,
        createdAt: '2026-10-15T10:00:00Z',
      },
    ]);
    repo.remove.mockResolvedValue();
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'pluginImport.imported.remove' }));

    await waitFor(() => {
      expect(repo.remove).toHaveBeenCalledWith('p1');
    });
  });
});
