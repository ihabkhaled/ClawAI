import { decodeCaptureChunk } from '../../../processing/utilities/capture-chunk.utility';
import { LiveCaptureManager } from '../live-capture.manager';

describe('LiveCaptureManager', () => {
  const pipeline = {
    rpush: vi.fn(),
    ltrim: vi.fn(),
    expire: vi.fn(),
    exec: vi.fn().mockResolvedValue([]),
  };
  pipeline.rpush.mockReturnValue(pipeline);
  pipeline.ltrim.mockReturnValue(pipeline);
  pipeline.expire.mockReturnValue(pipeline);
  const redis = { set: vi.fn(), multi: vi.fn(() => pipeline) };
  const manager = new LiveCaptureManager(redis as never);

  beforeEach(() => vi.clearAllMocks());

  it('claims the per-session slot with SET NX PX 3000', async () => {
    redis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);
    await expect(manager.claimRateSlot('sess1')).resolves.toBe(true);
    await expect(manager.claimRateSlot('sess1')).resolves.toBe(false);
    expect(redis.set).toHaveBeenCalledWith('live:capture-rate:sess1', '1', 'PX', 3000, 'NX');
  });

  it('RPUSHes the encoded chunk, keeps the newest 20 and sets a TTL', async () => {
    const chunk = { wav: Buffer.from('RIFFdata'), startAt: 1000, endAt: 7000 };
    await manager.enqueue('run1', chunk);
    const entry = pipeline.rpush.mock.calls[0]?.[1] as Buffer;
    expect(pipeline.rpush).toHaveBeenCalledWith('live:capture:run1', expect.any(Buffer));
    expect(decodeCaptureChunk(entry)).toEqual(chunk);
    expect(pipeline.ltrim).toHaveBeenCalledWith('live:capture:run1', -20, -1);
    expect(pipeline.expire).toHaveBeenCalledWith('live:capture:run1', 120);
    expect(pipeline.exec).toHaveBeenCalled();
  });
});
