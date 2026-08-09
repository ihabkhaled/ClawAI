import { GatewayConfigRepository } from '../gateway-config.repository';

describe('GatewayConfigRepository', () => {
  it('casts the advisory lock result to a Prisma-supported scalar', async () => {
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([{ lock: '' }]),
      seedExecution: {
        findUnique: jest.fn().mockResolvedValue({
          status: 'COMPLETED',
          checksum: 'checksum',
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
      ),
    };
    const repository = new GatewayConfigRepository(prisma as never);

    await repository.importEnvironmentOnce({
      name: 'gateway-config-environment-bootstrap',
      version: 1,
      checksum: 'checksum',
      configurations: [],
    });

    const lockQuery = transaction.$queryRaw.mock.calls[0]?.[0];
    expect(lockQuery?.text).toContain('pg_advisory_xact_lock($1)::text');
  });
});
