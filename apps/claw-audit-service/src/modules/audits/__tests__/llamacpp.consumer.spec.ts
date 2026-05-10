import { LlamacppAuditConsumer } from '../consumers/llamacpp.consumer';
import { LLAMACPP_AUDIT_ENTITY_TYPE } from '../constants/llamacpp-audit.constants';

describe('LlamacppAuditConsumer', () => {
  function build(): {
    consumer: LlamacppAuditConsumer;
    audits: { createAuditLog: jest.Mock };
    rabbit: { subscribe: jest.Mock };
  } {
    const audits = { createAuditLog: jest.fn().mockResolvedValue({}) };
    const rabbit = { subscribe: jest.fn().mockImplementation(async () => {}) };
    const consumer = new LlamacppAuditConsumer(rabbit as any, audits as any);
    return { consumer, audits, rabbit };
  }

  it('subscribes to all 11 LLAMACPP_* event patterns on init', async () => {
    const { consumer, rabbit } = build();
    await consumer.onModuleInit();
    expect(rabbit.subscribe).toHaveBeenCalledTimes(11);
    const patterns = rabbit.subscribe.mock.calls.map((call) => call[0]);
    expect(patterns).toEqual(
      expect.arrayContaining([
        'llamacpp.binary.installed',
        'llamacpp.binary.updated',
        'llamacpp.pull.started',
        'llamacpp.pull.progress',
        'llamacpp.pull.completed',
        'llamacpp.pull.failed',
        'llamacpp.model.loaded',
        'llamacpp.model.unloaded',
        'llamacpp.model.crashed',
        'llamacpp.weights.deleted',
        'llamacpp.preflight.overridden',
      ]),
    );
  });

  it('binary.installed → audit row with severity=LOW under llamacpp_model entity', async () => {
    const { consumer, audits, rabbit } = build();
    await consumer.onModuleInit();
    const handler = handlerForPattern(rabbit, 'llamacpp.binary.installed');
    await handler({ version: 'b8994', platform: 'linux-x64-cpu', binaryPath: '/x' });
    expect(audits.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'system',
        action: 'LLAMACPP_BINARY_INSTALLED',
        entityType: LLAMACPP_AUDIT_ENTITY_TYPE,
        entityId: 'binary:linux-x64-cpu',
        severity: 'LOW',
      }),
    );
  });

  it('pull.failed → severity HIGH', async () => {
    const { consumer, audits, rabbit } = build();
    await consumer.onModuleInit();
    const handler = handlerForPattern(rabbit, 'llamacpp.pull.failed');
    await handler({ jobId: 'j', modelId: 'm', reasonCode: 'SHA_MISMATCH', errorMessage: 'x' });
    expect(audits.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LLAMACPP_PULL_FAILED', severity: 'HIGH' }),
    );
  });

  it('pull.progress → never writes (high-frequency event suppressed)', async () => {
    const { consumer, audits, rabbit } = build();
    await consumer.onModuleInit();
    const handler = handlerForPattern(rabbit, 'llamacpp.pull.progress');
    await handler({ jobId: 'j', modelId: 'm', downloadedBytes: 10, totalBytes: 100 });
    expect(audits.createAuditLog).not.toHaveBeenCalled();
  });

  it('weights.deleted → severity HIGH', async () => {
    const { consumer, audits, rabbit } = build();
    await consumer.onModuleInit();
    const handler = handlerForPattern(rabbit, 'llamacpp.weights.deleted');
    await handler({ modelId: 'm', modelName: 'glm-5.1:Q4_K_M' });
    expect(audits.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LLAMACPP_WEIGHTS_DELETED', severity: 'HIGH' }),
    );
  });

  it('preflight.overridden → records userId from payload (not "system")', async () => {
    const { consumer, audits, rabbit } = build();
    await consumer.onModuleInit();
    const handler = handlerForPattern(rabbit, 'llamacpp.preflight.overridden');
    await handler({
      userId: 'admin-user',
      modelId: 'm',
      modelName: 'glm:Q4',
      reasons: ['RAM_INSUFFICIENT'],
    });
    expect(audits.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'admin-user', severity: 'MEDIUM' }),
    );
  });
});

function handlerForPattern(
  rabbit: { subscribe: jest.Mock },
  pattern: string,
): (raw: unknown) => Promise<void> {
  const call = rabbit.subscribe.mock.calls.find((c) => c[0] === pattern);
  if (!call) {
    throw new Error(`No subscription found for ${pattern}`);
  }
  return call[1];
}
