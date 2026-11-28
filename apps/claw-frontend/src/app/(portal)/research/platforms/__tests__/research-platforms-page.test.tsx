import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ResearchPlatformsPage from '@/app/(portal)/research/platforms/page';
import { Locale } from '@/enums/locale.enum';
import { ResearchPlatformAccessMethod } from '@/enums/research-platform-access-method.enum';
import { ResearchPlatformApiKind } from '@/enums/research-platform-api-kind.enum';
import { ResearchPlatformCategory } from '@/enums/research-platform-category.enum';
import { ResearchPlatformTestOutcome } from '@/enums/research-platform-test-outcome.enum';
import { getTranslation } from '@/lib/i18n/translations';
import type { ResearchPlatform } from '@/types/research-platform.types';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  test: vi.fn(),
}));

vi.mock('@/repositories/research/research-platform.repository', () => ({
  researchPlatformRepository: mocks,
}));
// The real English dictionary, so every label asserted here is the text a reader sees.
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      getTranslation(Locale.EN, key, params),
    locale: Locale.EN,
  }),
}));

const platform = (overrides: Partial<ResearchPlatform>): ResearchPlatform => ({
  id: 'id-reddit',
  slug: 'reddit',
  name: 'Reddit',
  category: ResearchPlatformCategory.FORUM,
  accessMethod: ResearchPlatformAccessMethod.SITE_SEARCH,
  apiKind: null,
  domains: ['reddit.com'],
  languages: [],
  enabled: true,
  priority: 100,
  maxResults: 5,
  timeoutMs: 8000,
  notes: null,
  ...overrides,
});

const REDDIT = platform({});
const ARXIV = platform({
  id: 'id-arxiv',
  slug: 'arxiv',
  name: 'arXiv',
  category: ResearchPlatformCategory.ACADEMIC,
  accessMethod: ResearchPlatformAccessMethod.OFFICIAL_API,
  apiKind: ResearchPlatformApiKind.ARXIV,
  domains: [],
  languages: ['en'],
  priority: 10,
});
const REUTERS = platform({
  id: 'id-reuters',
  slug: 'reuters',
  name: 'Reuters',
  category: ResearchPlatformCategory.NEWS,
  domains: ['reuters.com'],
  enabled: false,
});

function renderPage(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ResearchPlatformsPage />
    </QueryClientProvider>,
  );
}

describe('Research platforms page', () => {
  beforeEach(() => {
    for (const fn of Object.values(mocks)) {
      fn.mockReset();
    }
    mocks.list.mockResolvedValue([REDDIT, ARXIV, REUTERS]);
  });

  it('lists the platforms grouped by category, in category order', async () => {
    renderPage();

    const reddit = await screen.findByTestId('research-platform-row-reddit');
    expect(reddit).toHaveTextContent('Reddit');
    expect(reddit).toHaveTextContent('reddit.com');
    expect(reddit).toHaveTextContent('Site search');
    expect(reddit).toHaveTextContent('Any language');

    const arxiv = screen.getByTestId('research-platform-row-arxiv');
    expect(arxiv).toHaveTextContent('Official API');
    expect(arxiv).toHaveTextContent('arXiv');
    expect(arxiv).toHaveTextContent('en');

    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['News1', 'Academic1', 'Forums1']);
    expect(
      within(screen.getByTestId('research-platform-toggle-reuters')).getByRole('switch'),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('turns a platform off with one PATCH and reloads the list', async () => {
    mocks.update.mockResolvedValue({ ...REDDIT, enabled: false });
    renderPage();

    const toggle = within(await screen.findByTestId('research-platform-toggle-reddit')).getByRole(
      'switch',
      { name: 'Use Reddit in research' },
    );
    fireEvent.click(toggle);

    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('id-reddit', { enabled: false }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
  });

  it('says so when a toggle could not be saved', async () => {
    mocks.update.mockRejectedValue(new Error('boom'));
    renderPage();

    fireEvent.click(
      within(await screen.findByTestId('research-platform-toggle-reddit')).getByRole('switch'),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save that change. Try again.',
    );
  });

  it('shows a passing test result on the row', async () => {
    mocks.test.mockResolvedValue({ ok: true, resultCount: 5, latencyMs: 812 });
    renderPage();

    fireEvent.click(await screen.findByTestId('research-platform-test-reddit'));

    const result = await screen.findByTestId('research-platform-test-result-reddit');
    expect(result).toHaveTextContent('Works: 5 results in 812 ms');
    expect(result).toHaveAttribute('data-outcome', ResearchPlatformTestOutcome.PASSED);
    expect(mocks.test).toHaveBeenCalledWith('id-reddit');
  });

  it('uses the singular for one result', async () => {
    mocks.test.mockResolvedValue({ ok: true, resultCount: 1, latencyMs: 90.4 });
    renderPage();

    fireEvent.click(await screen.findByTestId('research-platform-test-arxiv'));

    expect(await screen.findByTestId('research-platform-test-result-arxiv')).toHaveTextContent(
      'Works: 1 result in 90 ms',
    );
  });

  it('shows a failed test with its code, and a request that never ran', async () => {
    mocks.test
      .mockResolvedValueOnce({ ok: false, resultCount: 0, latencyMs: 8000, errorCode: 'TIMEOUT' })
      .mockRejectedValueOnce(new Error('network'));
    renderPage();

    fireEvent.click(await screen.findByTestId('research-platform-test-reddit'));
    const failed = await screen.findByTestId('research-platform-test-result-reddit');
    expect(failed).toHaveTextContent('Failed (TIMEOUT) after 8000 ms');
    expect(failed).toHaveAttribute('data-outcome', ResearchPlatformTestOutcome.FAILED);

    fireEvent.click(screen.getByTestId('research-platform-test-arxiv'));
    const broken = await screen.findByTestId('research-platform-test-result-arxiv');
    expect(broken).toHaveTextContent('The test could not run.');
    expect(broken).toHaveAttribute('data-outcome', ResearchPlatformTestOutcome.REQUEST_FAILED);
  });

  it('disables the test button while that row is testing', async () => {
    let finish: (value: unknown) => void = () => undefined;
    mocks.test.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    renderPage();

    const button = await screen.findByTestId('research-platform-test-reddit');
    fireEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());
    expect(button).toHaveTextContent('Testing…');
    expect(screen.getByTestId('research-platform-test-arxiv')).not.toBeDisabled();
    finish({ ok: true, resultCount: 2, latencyMs: 10 });
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('asks before deleting, then deletes', async () => {
    mocks.remove.mockResolvedValue(undefined);
    renderPage();

    fireEvent.click(await screen.findByTestId('research-platform-delete-reddit'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Delete Reddit?');
    expect(mocks.remove).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('id-reddit'));
  });

  it('adds a site-search platform from the dialog', async () => {
    mocks.create.mockResolvedValue(platform({ id: 'id-quora', slug: 'quora', name: 'Quora' }));
    renderPage();

    fireEvent.click(await screen.findByTestId('research-platforms-add'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Slug'), { target: { value: 'quora' } });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Quora' } });
    fireEvent.change(within(dialog).getByLabelText('Domains'), {
      target: { value: 'Quora.com, quora.com\nanswers.quora.com' },
    });
    fireEvent.click(within(dialog).getByTestId('research-platform-form-submit'));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        slug: 'quora',
        name: 'Quora',
        category: ResearchPlatformCategory.NEWS,
        accessMethod: ResearchPlatformAccessMethod.SITE_SEARCH,
        apiKind: null,
        domains: ['quora.com', 'answers.quora.com'],
        languages: [],
        priority: 100,
        maxResults: 5,
        timeoutMs: 8000,
        notes: null,
      }),
    );
  });

  it('keeps the dialog open with a reason when the slug is invalid', async () => {
    renderPage();

    fireEvent.click(await screen.findByTestId('research-platforms-add'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Slug'), { target: { value: 'Bad Slug' } });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'X' } });
    fireEvent.click(within(dialog).getByTestId('research-platform-form-submit'));

    expect(await within(dialog).findByTestId('research-platform-form-error')).toHaveTextContent(
      'The slug must be 2–40 lowercase letters, digits or hyphens.',
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('edits a platform without sending its slug', async () => {
    mocks.update.mockResolvedValue(REDDIT);
    renderPage();

    fireEvent.click(await screen.findByTestId('research-platform-edit-reddit'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Edit Reddit');
    expect(within(dialog).getByLabelText('Slug')).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Priority'), { target: { value: '20' } });
    fireEvent.change(within(dialog).getByLabelText('Languages'), {
      target: { value: 'en, pt' },
    });
    fireEvent.click(within(dialog).getByTestId('research-platform-form-submit'));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    const [id, body] = mocks.update.mock.calls[0] as [string, Record<string, unknown>];
    expect(id).toBe('id-reddit');
    expect(body).not.toHaveProperty('slug');
    expect(body).toMatchObject({
      priority: 20,
      languages: ['en', 'pt'],
      domains: ['reddit.com'],
    });
  });

  it('shows the empty state when there are no platforms', async () => {
    mocks.list.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByTestId('research-platforms-empty')).toHaveTextContent(
      'No research platforms yet',
    );
  });

  it('shows the error state when the list cannot load', async () => {
    mocks.list.mockRejectedValue(new Error('403'));
    renderPage();

    expect(await screen.findByTestId('research-platforms-error')).toHaveTextContent(
      'Could not load the research platforms.',
    );
    expect(screen.queryByTestId('research-platforms-empty')).not.toBeInTheDocument();
  });
});
