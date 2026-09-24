import { getConnectorPreset } from '@claw/shared-utilities';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectorPresetLinks } from '@/components/connectors/connector-preset-links';
import { ConnectorProvider } from '@/enums';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        'connectors.linkRegister': 'Sign up',
        'connectors.linkApiKeys': 'API keys',
        'connectors.linkPricing': 'Pricing',
        'connectors.linkDocs': 'Docs',
      };
      return labels[key] ?? key;
    },
  }),
}));

describe('ConnectorPresetLinks', () => {
  const preset = getConnectorPreset(ConnectorProvider.OPENROUTER);
  if (preset === undefined) {
    throw new Error('OpenRouter preset missing — registry drifted');
  }

  it('renders all 4 links with the correct hrefs', () => {
    render(<ConnectorPresetLinks preset={preset} />);

    expect(screen.getByRole('link', { name: /Sign up/ })).toHaveAttribute(
      'href',
      preset.links.register,
    );
    expect(screen.getByRole('link', { name: /API keys/ })).toHaveAttribute(
      'href',
      preset.links.apiKeys,
    );
    expect(screen.getByRole('link', { name: /Pricing/ })).toHaveAttribute(
      'href',
      preset.links.pricing,
    );
    expect(screen.getByRole('link', { name: /Docs/ })).toHaveAttribute('href', preset.links.docs);
  });

  it('opens every link in a new tab with rel=noopener noreferrer', () => {
    render(<ConnectorPresetLinks preset={preset} />);

    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });
});
