import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ServiceAvailabilityBoundary } from '@/components/models/service-availability-boundary';
import { HealthStatus, OptionalService, ServiceStatus } from '@/enums';

const mockAvailability = vi.fn();

vi.mock('@/hooks/health/use-service-availability', () => ({
  useServiceAvailability: () => mockAvailability(),
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('ServiceAvailabilityBoundary', () => {
  it('suppresses page content and explains when the required service is down', () => {
    mockAvailability.mockReturnValue({
      isLoading: false,
      health: {
        status: HealthStatus.UNHEALTHY,
        timestamp: '2026-08-09T00:00:00.000Z',
        services: [
          {
            name: OptionalService.OLLAMA,
            status: ServiceStatus.DOWN,
            responseTimeMs: null,
            error: 'unreachable',
          },
        ],
        summary: { total: 1, up: 0, down: 1 },
      },
    });

    render(
      <ServiceAvailabilityBoundary service={OptionalService.OLLAMA}>
        <p>protected model content</p>
      </ServiceAvailabilityBoundary>,
    );

    expect(screen.queryByText('protected model content')).not.toBeInTheDocument();
    expect(screen.getByText('models.serviceUnavailable.title')).toBeInTheDocument();
    expect(screen.getByText('models.serviceUnavailable.ollamaDescription')).toBeInTheDocument();
  });

  it('renders children when the exact required service is up', () => {
    mockAvailability.mockReturnValue({
      isLoading: false,
      health: {
        status: HealthStatus.HEALTHY,
        timestamp: '2026-08-09T00:00:00.000Z',
        services: [
          {
            name: OptionalService.LLAMACPP,
            status: ServiceStatus.UP,
            responseTimeMs: 7,
            error: null,
          },
        ],
        summary: { total: 1, up: 1, down: 0 },
      },
    });

    render(
      <ServiceAvailabilityBoundary service={OptionalService.LLAMACPP}>
        <p>protected model content</p>
      </ServiceAvailabilityBoundary>,
    );

    expect(screen.getByText('protected model content')).toBeInTheDocument();
  });
});
