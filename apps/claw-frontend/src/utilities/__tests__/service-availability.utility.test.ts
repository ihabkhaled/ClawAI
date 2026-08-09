import { Cpu } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import type { SidebarItem } from '@/constants';
import { HealthStatus, OptionalService, ServiceStatus } from '@/enums';
import type { AggregatedHealth } from '@/types';

import {
  applyServiceAvailability,
  readServiceAvailability,
  requiredModelServiceForPath,
} from '../service-availability.utility';

const health: AggregatedHealth = {
  status: HealthStatus.DEGRADED,
  timestamp: '2026-08-09T00:00:00.000Z',
  services: [
    {
      name: OptionalService.OLLAMA,
      status: ServiceStatus.UP,
      responseTimeMs: 12,
      error: null,
    },
    {
      name: OptionalService.LLAMACPP,
      status: ServiceStatus.DOWN,
      responseTimeMs: null,
      error: 'unreachable',
    },
  ],
  summary: { total: 2, up: 1, down: 1 },
};

describe('service availability utilities', () => {
  it('maps exact health-service names and fails closed for missing services', () => {
    expect(readServiceAvailability(health, OptionalService.OLLAMA)).toBe(true);
    expect(readServiceAvailability(health, OptionalService.LLAMACPP)).toBe(false);
    expect(readServiceAvailability(undefined, OptionalService.OLLAMA)).toBe(false);
  });

  it('marks parents and children independently from their required service', () => {
    const items: SidebarItem[] = [
      {
        labelKey: 'nav.models',
        href: '/models',
        icon: Cpu,
        requiredService: OptionalService.OLLAMA,
        children: [
          {
            labelKey: 'nav.modelCatalog',
            href: '/models/catalog',
            icon: Cpu,
            requiredService: OptionalService.OLLAMA,
          },
          {
            labelKey: 'nav.modelLocalFrontier',
            href: '/models/local-frontier',
            icon: Cpu,
            requiredService: OptionalService.LLAMACPP,
          },
        ],
      },
    ];

    const result = applyServiceAvailability(items, health);

    expect(result[0]?.disabled).toBe(false);
    expect(result[0]?.children?.[0]?.disabled).toBe(false);
    expect(result[0]?.children?.[1]?.disabled).toBe(true);
  });

  it('requires llama.cpp only for the local-frontier route tree', () => {
    expect(requiredModelServiceForPath('/models')).toBe(OptionalService.OLLAMA);
    expect(requiredModelServiceForPath('/models/catalog')).toBe(OptionalService.OLLAMA);
    expect(requiredModelServiceForPath('/models/discovery/run-1')).toBe(OptionalService.OLLAMA);
    expect(requiredModelServiceForPath('/models/local-frontier')).toBe(OptionalService.LLAMACPP);
    expect(requiredModelServiceForPath('/models/local-frontier/model-1')).toBe(
      OptionalService.LLAMACPP,
    );
  });
});
