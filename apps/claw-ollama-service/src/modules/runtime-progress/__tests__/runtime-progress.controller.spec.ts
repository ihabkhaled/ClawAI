import {
  RuntimeExecutionProfile,
  type RuntimeProbeReport,
  RuntimeProbeStatus,
  RuntimeProvider,
} from '@claw/shared-types';
import { Reflector } from '@nestjs/core';
import { RuntimeProgressController } from '../controllers/runtime-progress.controller';
import { type OllamaProbeService } from '../services/ollama-probe.service';
import { ROLES_KEY } from '../../../app/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';

jest.mock('@common/utilities', () => ({
  createHttpClient: jest.fn(() => ({ get: jest.fn() })),
}));

jest.mock('../../../app/config/app.config', () => ({
  AppConfig: {
    get: (): { OLLAMA_BASE_URL: string } => ({ OLLAMA_BASE_URL: 'http://ollama:11434' }),
  },
}));

const buildReport = (): RuntimeProbeReport => ({
  provider: RuntimeProvider.OLLAMA,
  runtimeUrl: 'http://ollama:11434',
  status: RuntimeProbeStatus.REACHABLE,
  probedAtMs: 1700000000000,
  latencyMs: 12,
  version: '0.5.0',
  models: [],
  slots: [],
  executionProfile: RuntimeExecutionProfile.UNKNOWN,
  capabilities: {
    streamingText: true,
    thinking: false,
    promptProgress: false,
    nodeProgress: false,
    stepProgress: false,
    cancel: false,
    metrics: false,
  },
});

describe('RuntimeProgressController', () => {
  let controller: RuntimeProgressController;
  let probeService: jest.Mocked<Pick<OllamaProbeService, 'probe'>>;

  beforeEach(() => {
    probeService = { probe: jest.fn() };
    controller = new RuntimeProgressController(probeService as unknown as OllamaProbeService);
  });

  it('forwards the validated query to OllamaProbeService.probe and returns the report', async () => {
    const report = buildReport();
    probeService.probe.mockResolvedValue(report);

    const result = await controller.probe({ includeModels: true, timeoutMs: 5000 });

    expect(probeService.probe).toHaveBeenCalledTimes(1);
    expect(probeService.probe).toHaveBeenCalledWith({ includeModels: true, timeoutMs: 5000 });
    expect(result).toBe(report);
  });

  it('declares Roles(ADMIN) on the probe endpoint', () => {
    const reflector = new Reflector();
    const roles = reflector.get<UserRole[] | undefined>(ROLES_KEY, controller.probe);

    expect(roles).toEqual([UserRole.ADMIN]);
  });
});
