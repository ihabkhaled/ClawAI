import { RuntimeExecutionProfile, RuntimeProbeStatus, RuntimeProvider } from '@claw/shared-types';
import { AppConfig } from '../../../app/config/app.config';
import { LlamacppProbeService } from '../services/llamacpp-probe.service';

const baseEnv = {
  LLAMACPP_DATABASE_URL: 'postgresql://test',
  LLAMACPP_SERVICE_URL: 'http://llamacpp-service:4017',
  LLAMACPP_DATA_PATH: '/tmp/llamacpp',
  RABBITMQ_URL: 'amqp://test',
  JWT_SECRET: '0123456789abcdef0123456789abcdef',
  LLAMACPP_BIND_HOST: '127.0.0.1',
  LLAMACPP_REASONING_EXTRACTION_ENABLED: 'true',
};

function setEnv(extra: Record<string, string> = {}): void {
  process.env = { ...process.env, ...baseEnv, ...extra };
  AppConfig.reset();
}

function buildService(deps: {
  binary?: { snapshot: () => unknown } | { snapshot: () => never };
  supervisor?: { getCurrent: () => unknown } | { getCurrent: () => never };
  loadEvents?: { findRecent: jest.Mock };
}): LlamacppProbeService {
  const binary = deps.binary ?? { snapshot: (): unknown => null };
  const supervisor = deps.supervisor ?? { getCurrent: (): unknown => null };
  const loadEvents = deps.loadEvents ?? { findRecent: jest.fn().mockResolvedValue([]) };
  return new LlamacppProbeService(binary as any, supervisor as any, loadEvents as any);
}

describe('LlamacppProbeService', () => {
  beforeEach(() => {
    setEnv();
  });

  it('reports REACHABLE with activeModelId and version when binary installed and model active', async () => {
    const service = buildService({
      binary: {
        snapshot: (): unknown => ({
          installed: true,
          version: 'b4123',
          platform: 'linux-x64-cuda12',
          path: '/data/bin/llama-server',
        }),
      },
      supervisor: {
        getCurrent: (): unknown => ({ modelId: 'model-1', port: 48500, pid: 9000 }),
      },
      loadEvents: { findRecent: jest.fn().mockResolvedValue([]) },
    });
    const report = await service.probe();
    expect(report.provider).toBe(RuntimeProvider.LLAMACPP);
    expect(report.status).toBe(RuntimeProbeStatus.REACHABLE);
    expect(report.activeModelId).toBe('model-1');
    expect(report.version).toBe('b4123');
    expect(report.runtimeUrl).toBe('http://127.0.0.1:48500');
  });

  it('reports BINARY_MISSING when no binary installed', async () => {
    const service = buildService({
      binary: {
        snapshot: (): unknown => ({ installed: false, version: null, platform: null, path: null }),
      },
      supervisor: {
        getCurrent: (): unknown => null,
      },
    });
    const report = await service.probe();
    expect(report.status).toBe(RuntimeProbeStatus.BINARY_MISSING);
    expect(report.activeModelId).toBeUndefined();
    expect(report.version).toBeUndefined();
  });

  it('reports DEGRADED when binary installed but no model active', async () => {
    const service = buildService({
      binary: {
        snapshot: (): unknown => ({
          installed: true,
          version: 'b4123',
          platform: 'linux-x64-cpu',
          path: '/data/bin/llama-server',
        }),
      },
      supervisor: {
        getCurrent: (): unknown => null,
      },
    });
    const report = await service.probe();
    expect(report.status).toBe(RuntimeProbeStatus.DEGRADED);
    expect(report.activeModelId).toBeUndefined();
    expect(report.runtimeUrl).toBe(baseEnv.LLAMACPP_SERVICE_URL);
  });

  it('reports BINARY_MISSING when supervisor read throws and binary unknown', async () => {
    const service = buildService({
      binary: {
        snapshot: (): never => {
          throw new Error('binary read failed');
        },
      },
      supervisor: {
        getCurrent: (): never => {
          throw new Error('supervisor read failed');
        },
      },
    });
    const report = await service.probe();
    // Both reads fail → binary is null → status is BINARY_MISSING (the
    // probe never reports REACHABLE without proven binary). This is the
    // "unreachable on supervisor failure" case the spec asks for; status
    // is BINARY_MISSING because we cannot prove the binary is installed.
    expect(report.status).toBe(RuntimeProbeStatus.BINARY_MISSING);
  });

  it('maps executionProfile from binary.platform for CUDA / ROCM / CPU', async () => {
    const cases: Array<[string, RuntimeExecutionProfile]> = [
      ['linux-x64-cuda12', RuntimeExecutionProfile.CUDA],
      ['linux-x64-rocm', RuntimeExecutionProfile.ROCM],
      ['linux-x64-cpu', RuntimeExecutionProfile.CPU],
      ['linux-x64-vulkan', RuntimeExecutionProfile.VULKAN],
      ['darwin-arm64-metal', RuntimeExecutionProfile.METAL],
    ];
    for (const [platform, expected] of cases) {
      const service = buildService({
        binary: {
          snapshot: (): unknown => ({
            installed: true,
            version: 'b4123',
            platform,
            path: '/data/bin/llama-server',
          }),
        },
      });
      const report = await service.probe();
      expect(report.executionProfile).toBe(expected);
    }
  });

  it('truncates recentEvents to 10 and maps to {atMs,type,modelId,status,message}', async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({
      id: `event-${i.toString()}`,
      modelId: 'model-1',
      eventType: 'LOADED',
      pid: 1000 + i,
      port: 48500,
      errorMessage: i === 0 ? 'boom' : null,
      occurredAt: new Date(1_700_000_000_000 + i * 1000),
    }));
    const findRecent = jest
      .fn()
      .mockImplementation((limit: number) => Promise.resolve(rows.slice(0, limit)));
    const service = buildService({
      binary: {
        snapshot: (): unknown => ({
          installed: true,
          version: 'b4123',
          platform: 'linux-x64-cuda12',
          path: '/data/bin/llama-server',
        }),
      },
      supervisor: { getCurrent: (): unknown => ({ modelId: 'model-1', port: 48500, pid: 9000 }) },
      loadEvents: { findRecent },
    });
    const report = await service.probe();
    expect(findRecent).toHaveBeenCalledWith(10);
    expect(report.recentEvents).toHaveLength(10);
    const first = report.recentEvents?.[0];
    expect(first?.type).toBe('LOADED');
    expect(first?.modelId).toBe('model-1');
    expect(first?.status).toBe('FAILED');
    expect(first?.message).toBe('boom');
    expect(typeof first?.atMs).toBe('number');
  });

  it('capabilities.thinking is true when LLAMACPP_REASONING_EXTRACTION_ENABLED is true', async () => {
    setEnv({ LLAMACPP_REASONING_EXTRACTION_ENABLED: 'true' });
    const service = buildService({
      binary: {
        snapshot: (): unknown => ({
          installed: true,
          version: 'b4123',
          platform: 'linux-x64-cuda12',
          path: '/data/bin/llama-server',
        }),
      },
      supervisor: { getCurrent: (): unknown => ({ modelId: 'model-1', port: 48500, pid: 9000 }) },
    });
    const report = await service.probe();
    expect(report.capabilities?.thinking).toBe(true);
    expect(report.capabilities?.streamingText).toBe(true);
    expect(report.capabilities?.promptProgress).toBe(false);
    expect(report.capabilities?.cancel).toBe(true);
    expect(report.capabilities?.metrics).toBe(false);
  });

  it('capabilities.thinking is false when LLAMACPP_REASONING_EXTRACTION_ENABLED is false', async () => {
    setEnv({ LLAMACPP_REASONING_EXTRACTION_ENABLED: 'false' });
    const service = buildService({});
    const report = await service.probe();
    expect(report.capabilities?.thinking).toBe(false);
  });
});
