import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginsPage } from '@/components/plugins/plugins-page';
import { usePluginsPage } from '@/hooks/plugins/use-plugins-page';

import { pageState, pluginItem } from './plugins-fixtures';

vi.mock('@/hooks/plugins/use-plugins-page');

const mockPage = vi.mocked(usePluginsPage);

describe('PluginsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows skeletons while loading and no cards', () => {
    mockPage.mockReturnValue(pageState({ isLoading: true, items: [] }));
    render(<PluginsPage />);
    expect(screen.getByRole('status', { name: 'plugins.loading' })).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('shows an error with a retry that calls retry', () => {
    const retry = vi.fn();
    mockPage.mockReturnValue(pageState({ isError: true, items: [], retry }));
    render(<PluginsPage />);
    expect(screen.getByText('plugins.errorTitle')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows the plain empty state when nothing is filtered', () => {
    mockPage.mockReturnValue(pageState({ items: [] }));
    render(<PluginsPage />);
    expect(screen.getByText('plugins.emptyTitle')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'plugins.clearFilters' })).toBeNull();
  });

  it('shows the filtered empty state with a clear-filters button', () => {
    const clearFilters = vi.fn();
    mockPage.mockReturnValue(
      pageState({ items: [], filters: { q: 'zzz', category: '' }, clearFilters }),
    );
    render(<PluginsPage />);
    expect(screen.getByText('plugins.emptyFilteredTitle')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'plugins.clearFilters' }));
    expect(clearFilters).toHaveBeenCalledTimes(1);
  });

  it('lists a card per plugin, each linking to its detail page', () => {
    mockPage.mockReturnValue(
      pageState({ items: [pluginItem(), pluginItem({ slug: 'weather', name: 'Weather' })] }),
    );
    render(<PluginsPage />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    const links = within(screen.getByRole('list')).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/plugins/web-fetch',
      '/plugins/weather',
    ]);
  });

  it('has Discover and Installed links, with Discover as the current page', () => {
    mockPage.mockReturnValue(pageState());
    render(<PluginsPage />);
    const nav = within(screen.getByRole('navigation', { name: 'pluginsInstall.nav.label' }));
    expect(
      nav.getByRole('link', { name: 'pluginsInstall.nav.discover' }).getAttribute('aria-current'),
    ).toBe('page');
    const installed = nav.getByRole('link', { name: 'pluginsInstall.nav.installed' });
    expect(installed.getAttribute('href')).toBe('/plugins/installed');
    expect(installed.getAttribute('aria-current')).toBeNull();
    expect(screen.queryByRole('button', { name: 'plugins.loadMore' })).toBeNull();
  });

  it('loads more when a next page exists, and disables the button while fetching', () => {
    const loadMore = vi.fn();
    mockPage.mockReturnValue(pageState({ hasNextPage: true, loadMore }));
    const { rerender } = render(<PluginsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'plugins.loadMore' }));
    expect(loadMore).toHaveBeenCalledTimes(1);

    mockPage.mockReturnValue(pageState({ hasNextPage: true, isFetchingNextPage: true }));
    rerender(<PluginsPage />);
    const busy = screen.getByRole('button', { name: 'plugins.loadingMore' });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
  });

  it('writes typing into the search draft', () => {
    const setSearchDraft = vi.fn();
    mockPage.mockReturnValue(pageState({ setSearchDraft }));
    render(<PluginsPage />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'fet' } });
    expect(setSearchDraft).toHaveBeenCalledWith('fet');
  });

  it('picks a category from the chips', () => {
    const setCategory = vi.fn();
    mockPage.mockReturnValue(pageState({ setCategory }));
    render(<PluginsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'plugins.categories.search' }));
    expect(setCategory).toHaveBeenCalledWith('search');
    fireEvent.click(screen.getByRole('button', { name: 'plugins.categories.all' }));
    expect(setCategory).toHaveBeenCalledWith('');
  });
});
