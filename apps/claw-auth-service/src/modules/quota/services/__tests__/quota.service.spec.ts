import { QuotaService } from '../quota.service';
import { type RedisService } from '../../../../infrastructure/redis/redis.service';
import { type TokenLedgerRepository } from '../../repositories/token-ledger.repository';

const makeRedisClient = () => ({
  incrby: jest.fn(),
  decrby: jest.fn(),
  expire: jest.fn(),
});

describe('QuotaService', () => {
  let service: QuotaService;
  let client: ReturnType<typeof makeRedisClient>;
  let redis: { get: jest.Mock; getClient: jest.Mock };
  let ledger: { addUsage: jest.Mock; findForDay: jest.Mock };

  beforeEach(() => {
    client = makeRedisClient();
    redis = { get: jest.fn(), getClient: jest.fn().mockReturnValue(client) };
    ledger = { addUsage: jest.fn(), findForDay: jest.fn() };
    service = new QuotaService(
      redis as unknown as RedisService,
      ledger as unknown as TokenLedgerRepository,
    );
  });

  it('reserve succeeds when under the daily limit', async () => {
    client.incrby.mockResolvedValue(500);
    const res = await service.reserve('u1', 10000, 500);
    expect(res.ok).toBe(true);
    expect(client.decrby).not.toHaveBeenCalled();
  });

  it('sets TTL on the first write of the day', async () => {
    client.incrby.mockResolvedValue(500); // total === estimate → first write
    await service.reserve('u1', 10000, 500);
    expect(client.expire).toHaveBeenCalled();
  });

  it('reserve over the limit releases (decrby) and rejects', async () => {
    client.incrby.mockResolvedValue(10500); // over 10000
    const res = await service.reserve('u1', 10000, 1000);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('QUOTA_EXCEEDED');
      expect(res.snapshot.used).toBe(9500);
      expect(res.snapshot.remaining).toBe(500);
    }
    expect(client.decrby).toHaveBeenCalledWith(expect.any(String), 1000);
  });

  it('finalize adjusts the counter up when actual exceeds estimate and writes the ledger', async () => {
    await service.finalize({
      userId: 'u1',
      planId: 'p1',
      reservationId: 'r',
      estimate: 500,
      actualTotalTokens: 800,
      inputTokens: 300,
      outputTokens: 500,
      provider: 'OPENAI',
      model: 'gpt-4o',
    });
    expect(client.incrby).toHaveBeenCalledWith(expect.any(String), 300);
    expect(ledger.addUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        totalTokens: 800,
        inputTokens: 300,
        outputTokens: 500,
      }),
    );
  });

  it('finalize adjusts the counter down when actual is below estimate', async () => {
    await service.finalize({
      userId: 'u1',
      planId: null,
      reservationId: 'r',
      estimate: 1000,
      actualTotalTokens: 400,
      inputTokens: 200,
      outputTokens: 200,
      provider: 'OPENAI',
      model: 'gpt-4o',
    });
    expect(client.decrby).toHaveBeenCalledWith(expect.any(String), 600);
  });

  it('release decrements the reserved estimate', async () => {
    await service.release('u1', 750);
    expect(client.decrby).toHaveBeenCalledWith(expect.any(String), 750);
  });

  it('getSnapshot computes remaining from the Redis counter', async () => {
    redis.get.mockResolvedValue('3000');
    const snap = await service.getSnapshot('u1', 10000);
    expect(snap).toEqual({ dailyLimit: 10000, used: 3000, remaining: 7000 });
  });
});
