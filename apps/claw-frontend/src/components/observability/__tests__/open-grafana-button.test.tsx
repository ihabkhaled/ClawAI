import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenGrafanaButton } from '@/components/observability/open-grafana-button';
import type { UseOpenGrafanaResult } from '@/types';

const mockUseOpenGrafana = vi.fn<() => UseOpenGrafanaResult>();

vi.mock('@/hooks/observability/use-open-grafana', () => ({
  useOpenGrafana: () => mockUseOpenGrafana(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('OpenGrafanaButton', () => {
  const openGrafana = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an admin the link and opens Grafana on click', () => {
    mockUseOpenGrafana.mockReturnValue({ canOpenGrafana: true, isOpening: false, openGrafana });
    render(<OpenGrafanaButton />);

    const button = screen.getByRole('button', { name: 'observability.grafana.open' });
    expect(button).toHaveAttribute('title', 'observability.grafana.hint');
    fireEvent.click(button);
    expect(openGrafana).toHaveBeenCalledTimes(1);
  });

  it('renders nothing for anyone who is not an admin', () => {
    mockUseOpenGrafana.mockReturnValue({ canOpenGrafana: false, isOpening: false, openGrafana });
    const { container } = render(<OpenGrafanaButton />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is disabled and says so while the cookie is being minted', () => {
    mockUseOpenGrafana.mockReturnValue({ canOpenGrafana: true, isOpening: true, openGrafana });
    render(<OpenGrafanaButton />);
    const button = screen.getByRole('button', { name: 'observability.grafana.opening' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
