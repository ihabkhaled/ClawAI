import { ServiceStatus } from '@claw/shared-types';
import { deriveDependencyResults } from '../dependency-health.utility';
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
