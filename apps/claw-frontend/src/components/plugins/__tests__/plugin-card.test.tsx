import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PluginCard } from '@/components/plugins/plugin-card';
import { PluginCategoryChips } from '@/components/plugins/plugin-category-chips';
import { PluginIcon } from '@/components/plugins/plugin-icon';
import { PluginRiskBadge } from '@/components/plugins/plugin-risk-badge';
import { PLUGIN_ICONS } from '@/constants/plugins.constants';
import { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';

import { pluginItem, tStub } from './plugins-fixtures';

describe('PluginCard', () => {
  it('shows name, publisher, summary, risk, category and tool count', () => {
    render(<PluginCard plugin={pluginItem({ toolCount: 3 })} t={tStub} />);
    expect(screen.getByText('Web fetch')).toBeTruthy();
    expect(screen.getByText('ClawAI')).toBeTruthy();
    expect(screen.getByText('Read a public web page.')).toBeTruthy();
    expect(screen.getByText('plugins.risk.read')).toBeTruthy();
    expect(screen.getByText('plugins.categories.search')).toBeTruthy();
    expect(screen.getByText('plugins.toolsCount|3')).toBeTruthy();
  });

  it('is named by the plugin name and described by the summary, risk and tools', () => {
    render(<PluginCard plugin={pluginItem({ toolCount: 3 })} t={tStub} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('aria-label')).toBeNull();
    expect(link.getAttribute('aria-labelledby')).toBe(screen.getByText('Web fetch').id);
    expect(link.getAttribute('aria-labelledby')).not.toBe('');
    const describedBy = (link.getAttribute('aria-describedby') ?? '').split(' ');
    expect(describedBy).toHaveLength(2);
    expect(describedBy).toContain(screen.getByText('Read a public web page.').id);
    const details = document.getElementById(describedBy[1] ?? '');
    expect(details?.textContent).toContain('plugins.risk.read');
    expect(details?.textContent).toContain('plugins.toolsCount|3');
  });

  it('shows an Installed badge only for an installed plugin', () => {
    const { rerender } = render(<PluginCard plugin={pluginItem()} t={tStub} />);
    expect(screen.queryByText('pluginsInstall.install.installed')).toBeNull();
    rerender(<PluginCard plugin={pluginItem({ installed: true })} t={tStub} />);
    expect(screen.getByText('pluginsInstall.install.installed')).toBeTruthy();
  });

  it('shows an unknown category by its raw key', () => {
    render(<PluginCard plugin={pluginItem({ category: 'weird' })} t={tStub} />);
    expect(screen.getByText('weird')).toBeTruthy();
  });

  it('encodes the slug in the link', () => {
    render(<PluginCard plugin={pluginItem({ slug: 'a b' })} t={tStub} />);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/plugins/a%20b');
  });
});

describe('PluginRiskBadge', () => {
  it.each([
    [PluginRiskLevel.Read, 'plugins.risk.read'],
    [PluginRiskLevel.Write, 'plugins.risk.write'],
    [PluginRiskLevel.Destructive, 'plugins.risk.destructive'],
  ])('labels %s', (risk, label) => {
    render(<PluginRiskBadge risk={risk} t={tStub} />);
    expect(screen.getByTestId('plugin-risk-badge').textContent).toBe(label);
  });
});

describe('PluginIcon', () => {
  it('renders a known icon and falls back for an unknown key', () => {
    const { container, rerender } = render(<PluginIcon iconKey="globe" />);
    expect(container.querySelector('svg')).toBeTruthy();
    rerender(<PluginIcon iconKey="not-a-key" className="h-7" />);
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('h-7');
  });
});

describe('PLUGIN_ICONS keys', () => {
  it('maps cloud and weather to the same icon', () => {
    expect(PLUGIN_ICONS.cloud).toBeDefined();
    expect(PLUGIN_ICONS.cloud).toBe(PLUGIN_ICONS.weather);
  });
});

describe('PluginCategoryChips', () => {
  it('marks the active chip as pressed', () => {
    render(<PluginCategoryChips value="dev" onChange={() => undefined} t={tStub} />);
    expect(
      screen.getByRole('button', { name: 'plugins.categories.dev' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen.getByRole('button', { name: 'plugins.categories.all' }).getAttribute('aria-pressed'),
    ).toBe('false');
  });
});
