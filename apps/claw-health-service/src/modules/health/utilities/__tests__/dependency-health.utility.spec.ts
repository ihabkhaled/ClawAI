import { ServiceStatus } from '@claw/shared-types';
import { deriveDependencyResults, deriveDisabledDependencies } from '../dependency-health.utility';
import { DEPENDENCY_DOWN_ERROR, DEPENDENCY_PROBES } from '../../constants/health.constants';

// Contract: file-service `/api/v1/health` answers
//   { status, timestamp, services: { database, redis, clamav: 'up'|'down'|'disabled' } }
// (apps/claw-file-service/src/modules/health/types/health.types.ts). The
// "Antivirus scanner" status component is driven by that `clamav` key.
const fileServiceHealth = (clamav: unknown): unknown => ({
  status: 'ok',
  timestamp: '2026-09-25T12:00:00.000Z',
  services: { database: 'up', redis: 'up', clamav },
});

describe('deriveDependencyResults', () => {
  it('probes ClamAV through file-service', () => {
    expect(DEPENDENCY_PROBES).toContainEqual({
      name: 'clamav',
      source: 'file-service',
      key: 'clamav',
    });
  });

  it('reports clamav UP when file-service says up', () => {
    const results = deriveDependencyResults(
      DEPENDENCY_PROBES,
      new Map([['file-service', fileServiceHealth('up')]]),
    );
    expect(results).toEqual([
      { name: 'clamav', status: ServiceStatus.UP, responseTimeMs: null, error: null },
    ]);
  });

  it('reports clamav DOWN, with a host-free error, when file-service says down', () => {
    const results = deriveDependencyResults(
      DEPENDENCY_PROBES,
      new Map([['file-service', fileServiceHealth('down')]]),
    );
    expect(results).toEqual([
      {
        name: 'clamav',
        status: ServiceStatus.DOWN,
        responseTimeMs: null,
        error: DEPENDENCY_DOWN_ERROR,
      },
    ]);
  });

  it.each([
    ['disabled', fileServiceHealth('disabled')],
    ['missing key (older file-service)', { status: 'ok', services: { database: 'up' } }],
    ['no services object', { status: 'ok' }],
    ['non-object body', 'OK'],
  ])('omits clamav (not measured) when the source reports %s', (_label, body) => {
    expect(deriveDependencyResults(DEPENDENCY_PROBES, new Map([['file-service', body]]))).toEqual(
      [],
    );
  });

  it('omits clamav when file-service itself did not answer', () => {
    expect(deriveDependencyResults(DEPENDENCY_PROBES, new Map())).toEqual([]);
  });
});

// Contract: research-service `/api/v1/health` answers
//   { status: 'ok'|'degraded', service: 'research-service',
//     services: { crawl4ai, flaresolverr, firecrawl: 'up'|'down'|'disabled' } }
// (apps/claw-research-service/src/modules/health/types/health.types.ts). A
// down sidecar makes research `degraded`, and research stays UP here.
const researchHealth = (services: Record<string, string>, status = 'ok'): unknown => ({
  status,
  service: 'research-service',
  services,
});

describe('web scraper sidecars via research-service', () => {
  it('probes Crawl4AI, FlareSolverr and Firecrawl through research-service', () => {
    for (const name of ['crawl4ai', 'flaresolverr', 'firecrawl']) {
      expect(DEPENDENCY_PROBES).toContainEqual({ name, source: 'research-service', key: name });
    }
  });

  it('derives up / down rows and lists disabled ones separately', () => {
    const bodies = new Map([
      [
        'research-service',
        researchHealth({ crawl4ai: 'up', flaresolverr: 'down', firecrawl: 'disabled' }, 'degraded'),
      ],
    ]);

    expect(deriveDependencyResults(DEPENDENCY_PROBES, bodies)).toEqual([
      { name: 'crawl4ai', status: ServiceStatus.UP, responseTimeMs: null, error: null },
      {
        name: 'flaresolverr',
        status: ServiceStatus.DOWN,
        responseTimeMs: null,
        error: DEPENDENCY_DOWN_ERROR,
      },
    ]);
    expect(deriveDisabledDependencies(DEPENDENCY_PROBES, bodies)).toEqual(['firecrawl']);
  });

  it('seeded default: every sidecar disabled, no row and no outage', () => {
    const bodies = new Map([
      [
        'research-service',
        researchHealth({ crawl4ai: 'disabled', flaresolverr: 'disabled', firecrawl: 'disabled' }),
      ],
    ]);

    expect(deriveDependencyResults(DEPENDENCY_PROBES, bodies)).toEqual([]);
    expect(deriveDisabledDependencies(DEPENDENCY_PROBES, bodies)).toEqual([
      'crawl4ai',
      'flaresolverr',
      'firecrawl',
    ]);
  });

  it('nothing at all from an older research-service with no services object', () => {
    const bodies = new Map([['research-service', { status: 'ok', service: 'research-service' }]]);

    expect(deriveDependencyResults(DEPENDENCY_PROBES, bodies)).toEqual([]);
    expect(deriveDisabledDependencies(DEPENDENCY_PROBES, bodies)).toEqual([]);
  });

  it('ClamAV disabled is listed as disabled too', () => {
    expect(
      deriveDisabledDependencies(
        DEPENDENCY_PROBES,
        new Map([['file-service', fileServiceHealth('disabled')]]),
      ),
    ).toEqual(['clamav']);
  });
});
