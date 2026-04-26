import { Test, type TestingModule } from '@nestjs/testing';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern, LogLevel, type ServerLogPayload } from '@claw/shared-types';
import { ServerLogEventManager } from '../server-log-event.manager';
import { ServerLogsService } from '../../services/server-logs.service';

describe('ServerLogEventManager', () => {
  let manager: ServerLogEventManager;
  let rabbitMock: jest.Mocked<{ subscribe: jest.Mock }>;
  let serviceMock: jest.Mocked<{ createLog: jest.Mock }>;
  let capturedHandler: ((payload: unknown) => Promise<void>) | undefined;

  beforeEach(async () => {
    rabbitMock = {
      subscribe: jest.fn().mockImplementation(async (_pattern, handler) => {
        capturedHandler = handler;
      }),
    };
    serviceMock = { createLog: jest.fn().mockResolvedValue({ id: 'x' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerLogEventManager,
        { provide: RabbitMQService, useValue: rabbitMock },
        { provide: ServerLogsService, useValue: serviceMock },
      ],
    }).compile();

    manager = module.get<ServerLogEventManager>(ServerLogEventManager);
  });

  it('subscribes to LOG_SERVER pattern on module init', async () => {
    await manager.onModuleInit();
    expect(rabbitMock.subscribe).toHaveBeenCalledWith(
      EventPattern.LOG_SERVER,
      expect.any(Function),
    );
  });

  it('creates a server-log when a payload arrives, mapping `model` to `modelName`', async () => {
    await manager.onModuleInit();
    expect(capturedHandler).toBeDefined();

    const payload: ServerLogPayload = {
      timestamp: '2026-04-26T20:00:00.000Z',
      level: LogLevel.ERROR,
      message: 'oops',
      serviceName: 'auth-service',
      model: 'gpt-4',
      action: 'login',
    };

    await capturedHandler?.(payload);

    expect(serviceMock.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        level: LogLevel.ERROR,
        message: 'oops',
        serviceName: 'auth-service',
        modelName: 'gpt-4',
        action: 'login',
      }),
    );
  });
});
