import { HealthCheckStatus, ServiceStatus } from '../../../common/enums';
import { HealthService } from '../services/health.service';

describe('HealthService', () => {
  function buildService(opts: { dbOk?: boolean; binaryInstalled?: boolean; loaded?: boolean } = {}) {
    const dbOk = opts.dbOk ?? true;
    const prisma = { $queryRaw: dbOk ? jest.fn().mockResolvedValue([]) : jest.fn().mockRejectedValue(new Error('down')) };
    const binaryService = {
      snapshot: jest.fn().mockReturnValue(
        opts.binaryInstalled
          ? { installed: true, version: 'b4123', platform: 'linux-x64-cuda12', path: '/var/lib/claw/llamacpp/bin/llama-server' }
          : { installed: false, version: null, platform: null, path: null },
      ),
    };
    const lifecycle = {
      getLoadedSnapshot: jest.fn().mockReturnValue(opts.loaded ? { id: 'm', name: 'glm-5.1', tag: 'Q4_K_M', loadStatus: 'READY', port: 48500 } : null),
    };
    return new HealthService(prisma as any, binaryService as any, lifecycle as any);
  }

  it('returns ok when DB reachable', async () => {
    const svc = buildService();
    const result = await svc.check();
    expect(result.status).toBe(HealthCheckStatus.OK);
    expect(result.services.database).toBe(ServiceStatus.UP);
  });

  it('returns down when DB unreachable', async () => {
    const svc = buildService({ dbOk: false });
    const result = await svc.check();
    expect(result.status).toBe(HealthCheckStatus.DOWN);
    expect(result.services.database).toBe(ServiceStatus.DOWN);
  });

  it('reports binary not-installed by default', async () => {
    const svc = buildService();
    const result = await svc.check();
    expect(result.binary.installed).toBe(false);
    expect(result.activeModel).toBeNull();
  });

  it('reports binary installed when present', async () => {
    const svc = buildService({ binaryInstalled: true });
    const result = await svc.check();
    expect(result.binary.installed).toBe(true);
    expect(result.binary.version).toBe('b4123');
  });
});
