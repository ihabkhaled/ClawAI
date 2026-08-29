import { Test, type TestingModule } from '@nestjs/testing';
import { ConnectorsInternalController } from '../connectors-internal.controller';
import { ConnectorsService } from '../../services/connectors.service';
import { ModelsSnapshotManager } from '../../managers/models-snapshot.manager';

describe('ConnectorsInternalController', () => {
  let controller: ConnectorsInternalController;
  let serviceMock: {
    getConnectorConfig: jest.Mock;
    getHealthSnapshot: jest.Mock;
    getPaygPolicy: jest.Mock;
    validateExposedModels: jest.Mock;
  };
  let snapshotMock: { build: jest.Mock };

  beforeEach(async () => {
    serviceMock = {
      getConnectorConfig: jest.fn(),
      getHealthSnapshot: jest.fn(),
      getPaygPolicy: jest.fn(),
      validateExposedModels: jest.fn(),
    };
    snapshotMock = { build: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConnectorsInternalController],
      providers: [
        { provide: ConnectorsService, useValue: serviceMock },
        { provide: ModelsSnapshotManager, useValue: snapshotMock },
      ],
    }).compile();

    controller = module.get<ConnectorsInternalController>(ConnectorsInternalController);
  });

  describe('getPaygPolicy', () => {
    it('returns the rolled-up provider policy from the service', async () => {
      serviceMock.getPaygPolicy.mockResolvedValue({
        providers: { OPENAI: true, ANTHROPIC: true, OLLAMA: false },
      });

      const result = await controller.getPaygPolicy();

      expect(result).toEqual({ providers: { OPENAI: true, ANTHROPIC: true, OLLAMA: false } });
      expect(serviceMock.getPaygPolicy).toHaveBeenCalledTimes(1);
    });

    // The rollup itself is the contract auth-service reserves against, so the
    // route has to prove it survives the transport: several connectors of one
    // provider collapse to a single metered entry, and a provider whose only
    // metered connector is disabled comes back as an explicit false.
    it('exposes one entry per distinct provider, metered when any enabled one is', async () => {
      serviceMock.getPaygPolicy.mockResolvedValue({
        providers: { OPENAI: true, GEMINI: false },
      });

      const { providers } = await controller.getPaygPolicy();

      expect(Object.keys(providers).sort()).toEqual(['GEMINI', 'OPENAI']);
      expect(providers.OPENAI).toBe(true);
      expect(providers.GEMINI).toBe(false);
    });

    // No secret, no user, no balance, no amount — the reason @Public() is
    // acceptable on this route and would not be on a money-moving one.
    it('returns nothing but provider names and booleans', async () => {
      serviceMock.getPaygPolicy.mockResolvedValue({ providers: { OPENAI: true } });

      const result = await controller.getPaygPolicy();

      expect(Object.keys(result)).toEqual(['providers']);
      expect(Object.values(result.providers).every((v) => typeof v === 'boolean')).toBe(true);
    });
  });

  it('getConfig forwards the provider', async () => {
    serviceMock.getConnectorConfig.mockResolvedValue({ provider: 'OPENAI', apiKey: 'sk-x' });

    await controller.getConfig('OPENAI');

    expect(serviceMock.getConnectorConfig).toHaveBeenCalledWith('OPENAI');
  });

  it('getHealthSnapshot delegates to the service', async () => {
    serviceMock.getHealthSnapshot.mockResolvedValue({ connectors: [], generatedAt: 'now' });

    await controller.getHealthSnapshot();

    expect(serviceMock.getHealthSnapshot).toHaveBeenCalledTimes(1);
  });

  it('getModelsSnapshot delegates to the snapshot manager', async () => {
    snapshotMock.build.mockResolvedValue({ models: [], generatedAt: 'now' });

    await controller.getModelsSnapshot();

    expect(snapshotMock.build).toHaveBeenCalledTimes(1);
  });

  it('validateExposedModels forwards the pairs', async () => {
    serviceMock.validateExposedModels.mockResolvedValue({ valid: [] });

    await controller.validateExposedModels({ pairs: [{ provider: 'OPENAI', model: 'gpt-5' }] });

    expect(serviceMock.validateExposedModels).toHaveBeenCalledWith([
      { provider: 'OPENAI', model: 'gpt-5' },
    ]);
  });
});
