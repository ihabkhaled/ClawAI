import { LlamacppEventsPublisher } from '../llamacpp-events.publisher';
import { PreflightReason, PullReasonCode } from '../../enums';

describe('LlamacppEventsPublisher', () => {
  const makeRabbit = () => ({ publish: jest.fn().mockResolvedValue(undefined) });

  function build(): { publisher: LlamacppEventsPublisher; rabbit: ReturnType<typeof makeRabbit> } {
    const rabbit = makeRabbit();
    const publisher = new LlamacppEventsPublisher(rabbit as any);
    return { publisher, rabbit };
  }

  it('publishes binary.installed with correct payload', () => {
    const { publisher, rabbit } = build();
    publisher.binaryInstalled({ version: 'b8994', platform: 'linux-x64-cpu', binaryPath: '/x' });
    expect(rabbit.publish).toHaveBeenCalledWith('llamacpp.binary.installed', {
      version: 'b8994',
      platform: 'linux-x64-cpu',
      binaryPath: '/x',
    });
  });

  it('publishes binary.updated with previousVersion', () => {
    const { publisher, rabbit } = build();
    publisher.binaryUpdated({ version: 'b8995', previousVersion: 'b8994', platform: 'linux-x64-cpu' });
    expect(rabbit.publish).toHaveBeenCalledWith(
      'llamacpp.binary.updated',
      expect.objectContaining({ previousVersion: 'b8994' }),
    );
  });

  it('coerces bigint downloadedBytes/totalBytes to number for pull.progress', () => {
    const { publisher, rabbit } = build();
    publisher.pullProgress({
      jobId: 'j1',
      modelId: 'm1',
      downloadedBytes: 10n,
      totalBytes: 100n,
      completedFiles: 1,
      totalFiles: 5,
    });
    expect(rabbit.publish).toHaveBeenCalledWith('llamacpp.pull.progress', {
      jobId: 'j1',
      modelId: 'm1',
      downloadedBytes: 10,
      totalBytes: 100,
      completedFiles: 1,
      totalFiles: 5,
    });
  });

  it('coerces bigint totalBytes for pull.completed', () => {
    const { publisher, rabbit } = build();
    publisher.pullCompleted({ jobId: 'j', modelId: 'm', totalBytes: 999n });
    expect(rabbit.publish).toHaveBeenCalledWith('llamacpp.pull.completed', {
      jobId: 'j',
      modelId: 'm',
      totalBytes: 999,
    });
  });

  it('publishes pull.failed with reasonCode + errorMessage', () => {
    const { publisher, rabbit } = build();
    publisher.pullFailed({
      jobId: 'j',
      modelId: 'm',
      reasonCode: PullReasonCode.SHA_MISMATCH,
      errorMessage: 'bad sha',
    });
    expect(rabbit.publish).toHaveBeenCalledWith(
      'llamacpp.pull.failed',
      expect.objectContaining({ reasonCode: PullReasonCode.SHA_MISMATCH, errorMessage: 'bad sha' }),
    );
  });

  it('publishes model.loaded / model.unloaded / model.crashed', () => {
    const { publisher, rabbit } = build();
    publisher.modelLoaded({ modelId: 'm', modelName: 'glm:Q4', pid: 100, port: 48500 });
    publisher.modelUnloaded({ modelId: 'm', modelName: 'glm:Q4' });
    publisher.modelCrashed({ modelId: 'm', modelName: 'glm:Q4', exitCode: 1, signal: null });

    expect(rabbit.publish).toHaveBeenNthCalledWith(
      1,
      'llamacpp.model.loaded',
      expect.objectContaining({ pid: 100, port: 48500 }),
    );
    expect(rabbit.publish).toHaveBeenNthCalledWith(2, 'llamacpp.model.unloaded', {
      modelId: 'm',
      modelName: 'glm:Q4',
    });
    expect(rabbit.publish).toHaveBeenNthCalledWith(
      3,
      'llamacpp.model.crashed',
      expect.objectContaining({ exitCode: 1 }),
    );
  });

  it('publishes weights.deleted', () => {
    const { publisher, rabbit } = build();
    publisher.weightsDeleted({ modelId: 'm', modelName: 'glm:Q4' });
    expect(rabbit.publish).toHaveBeenCalledWith('llamacpp.weights.deleted', {
      modelId: 'm',
      modelName: 'glm:Q4',
    });
  });

  it('serialises preflight reasons into string[]', () => {
    const { publisher, rabbit } = build();
    publisher.preflightOverridden({
      userId: 'u1',
      modelId: 'm',
      modelName: 'glm:Q4',
      reasons: [PreflightReason.RAM_INSUFFICIENT, PreflightReason.GPU_INSUFFICIENT],
    });
    expect(rabbit.publish).toHaveBeenCalledWith(
      'llamacpp.preflight.overridden',
      expect.objectContaining({
        reasons: [PreflightReason.RAM_INSUFFICIENT, PreflightReason.GPU_INSUFFICIENT],
      }),
    );
  });

  it('swallows publish errors without throwing (logs only)', () => {
    const rabbit = { publish: jest.fn().mockImplementation(() => { throw new Error('amqp down'); }) };
    const publisher = new LlamacppEventsPublisher(rabbit as any);
    expect(() => publisher.weightsDeleted({ modelId: 'm', modelName: 'x:y' })).not.toThrow();
  });
});
