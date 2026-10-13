import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PluginDetailRoutePage from '../[slug]/page';
import PluginsRoutePage from '../page';

const routeState = vi.hoisted(() => ({ slug: 'web-fetch' }));

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: routeState.slug }),
}));
vi.mock('@/components/plugins/plugins-page', () => ({
  PluginsPage: () => <div data-testid="plugins-page" />,
}));
vi.mock('@/components/plugins/plugin-detail-page', () => ({
  PluginDetailPage: ({ slug }: { slug: string }) => <div data-testid="plugin-detail">{slug}</div>,
}));

describe('plugins route files', () => {
  beforeEach(() => {
    routeState.slug = 'web-fetch';
  });

  it('renders the Discover page', () => {
    render(<PluginsRoutePage />);
    expect(screen.getByTestId('plugins-page')).toBeTruthy();
  });

  it('passes the slug to the detail page', () => {
    render(<PluginDetailRoutePage />);
    expect(screen.getByTestId('plugin-detail').textContent).toBe('web-fetch');
  });

  it('decodes an encoded slug', () => {
    routeState.slug = 'a%20b';
    render(<PluginDetailRoutePage />);
    expect(screen.getByTestId('plugin-detail').textContent).toBe('a b');
  });

  it('keeps a malformed encoded slug as it is instead of throwing', () => {
    routeState.slug = '%E0%A4%A';
    render(<PluginDetailRoutePage />);
    expect(screen.getByTestId('plugin-detail').textContent).toBe('%E0%A4%A');
  });
});
