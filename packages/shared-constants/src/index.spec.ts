import {
  AUTH_SERVICE_PORT,
  CHAT_SERVICE_PORT,
  EXCHANGE_NAME,
  HEALTH_SERVICE_PORT,
  LLAMACPP_SERVICE_PORT,
  PAYMENT_SERVICE_PORT,
  RABBITMQ_QUEUE_PREFIX,
} from './index';
import * as constants from './index';

describe('shared-constants', () => {
  it('exposes the canonical RabbitMQ exchange name and queue prefix', () => {
    expect(EXCHANGE_NAME).toBe('claw.events');
    expect(RABBITMQ_QUEUE_PREFIX).toBe('claw');
  });

  it('assigns each service a unique port in the 4001-4018 range', () => {
    const portEntries = Object.entries(constants).filter(([key]) => key.endsWith('_SERVICE_PORT'));
    const ports = portEntries.map(([, value]) => value as number);

    expect(ports.length).toBeGreaterThanOrEqual(16);
    for (const port of ports) {
      expect(port).toBeGreaterThanOrEqual(4001);
      expect(port).toBeLessThanOrEqual(4018);
    }
    expect(new Set(ports).size).toBe(ports.length);
  });

  it('keeps the well-known anchor ports stable', () => {
    expect(AUTH_SERVICE_PORT).toBe(4001);
    expect(CHAT_SERVICE_PORT).toBe(4002);
    expect(HEALTH_SERVICE_PORT).toBe(4009);
    expect(LLAMACPP_SERVICE_PORT).toBe(4017);
    expect(PAYMENT_SERVICE_PORT).toBe(4018);
  });
});
