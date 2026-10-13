import { ConsoleLogger, Logger } from '@nestjs/common';
import { EventPattern, LogLevel } from '@claw/shared-types';

import { RabbitMQLoggerService } from '../rabbitmq-logger.service';
import { RabbitMQService } from '../rabbitmq.service';
import { StructuredLogger } from '../structured-logger';

function fakeBroker(implementation: () => Promise<void> = () => Promise.resolve()) {
  const broker = new RabbitMQService({ url: 'amqp://unused', serviceName: 'test' });
  const publish = vi.spyOn(broker, 'publish').mockImplementation(implementation);
  return { broker, publish };
}

function settle() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('StructuredLogger', () => {
  beforeEach(() => {
    for (const method of ['log', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(Logger.prototype, method).mockImplementation(() => {});
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    [LogLevel.ERROR, 'error'],
    [LogLevel.WARN, 'warn'],
    [LogLevel.DEBUG, 'debug'],
    [LogLevel.INFO, 'log'],
  ] as const)('writes a %s entry locally through Logger.%s', (level, method) => {
    const { broker } = fakeBroker();
    const logger = new StructuredLogger(broker, 'chat', EventPattern.LOG_SERVER, 'ChatService');
    logger.logAction({ level, message: 'hello', action: 'send' });

    expect(Logger.prototype[method]).toHaveBeenCalledWith('[send] hello');
  });

  it('publishes the structured payload to its event pattern', () => {
    const { broker, publish } = fakeBroker();
    const logger = new StructuredLogger(broker, 'chat', EventPattern.LOG_SERVER);
    logger.logAction({ level: LogLevel.INFO, message: 'hello', userId: 'u1', latencyMs: 12 });

    expect(Logger.prototype.log).toHaveBeenCalledWith('[] hello');
    expect(publish).toHaveBeenCalledWith(
      EventPattern.LOG_SERVER,
      expect.objectContaining({
        level: LogLevel.INFO,
        message: 'hello',
        serviceName: 'chat',
        userId: 'u1',
        latencyMs: 12,
        timestamp: expect.any(String),
      }),
    );
  });

  it('never lets a failed publish escape into the caller', async () => {
    const { broker } = fakeBroker(() => Promise.reject(new Error('broker down')));
    const logger = new StructuredLogger(broker, 'chat', EventPattern.LOG_SERVER);

    expect(() => logger.logAction({ level: LogLevel.ERROR, message: 'x' })).not.toThrow();
    await settle();
  });
});

describe('RabbitMQLoggerService', () => {
  beforeEach(() => {
    for (const method of ['log', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(ConsoleLogger.prototype, method).mockImplementation(() => {});
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('only writes to the console until a broker is attached', () => {
    const logger = new RabbitMQLoggerService();
    logger.log('booting');

    expect(ConsoleLogger.prototype.log).toHaveBeenCalledWith('booting');
  });

  it.each([
    ['log', 'INFO'],
    ['error', 'ERROR'],
    ['warn', 'WARN'],
  ] as const)('forwards %s entries to log.server as %s', (method, level) => {
    const { broker, publish } = fakeBroker();
    const logger = new RabbitMQLoggerService();
    logger.setRabbitMQ(broker, 'chat');

    logger[method]('something happened', 'ChatService');

    expect(publish).toHaveBeenCalledWith(
      'log.server',
      expect.objectContaining({
        level,
        message: 'something happened',
        serviceName: 'chat',
        module: 'ChatService',
      }),
    );
  });

  it('keeps debug output local', () => {
    const { broker, publish } = fakeBroker();
    const logger = new RabbitMQLoggerService();
    logger.setRabbitMQ(broker, 'chat');

    logger.debug('noise');

    expect(ConsoleLogger.prototype.debug).toHaveBeenCalledWith('noise');
    expect(publish).not.toHaveBeenCalled();
  });

  it('skips Nest framework bootstrap contexts', () => {
    const { broker, publish } = fakeBroker();
    const logger = new RabbitMQLoggerService();
    logger.setRabbitMQ(broker, 'chat');

    logger.log('Mapped {/x, GET} route', 'RouterExplorer');

    expect(publish).not.toHaveBeenCalled();
  });

  it('serialises non-string messages and drops entries logged while publishing', async () => {
    let release: () => void = () => {};
    const { broker, publish } = fakeBroker(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const logger = new RabbitMQLoggerService();
    logger.setRabbitMQ(broker, 'chat');

    logger.log({ id: 1 });
    logger.log('logged while the first publish is in flight');
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(
      'log.server',
      expect.objectContaining({ message: '{"id":1}' }),
    );

    release();
    await settle();
    logger.log('after the first publish settled');
    expect(publish).toHaveBeenCalledTimes(2);
  });

  it('recovers after a failed publish', async () => {
    let calls = 0;
    const { broker, publish } = fakeBroker(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('down')) : Promise.resolve();
    });
    const logger = new RabbitMQLoggerService();
    logger.setRabbitMQ(broker, 'chat');

    logger.error('first');
    await settle();
    logger.error('second');

    expect(publish).toHaveBeenCalledTimes(2);
  });
});
