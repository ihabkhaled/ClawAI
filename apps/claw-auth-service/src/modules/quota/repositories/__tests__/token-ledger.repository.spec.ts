import { TokenLedgerRepository } from '../token-ledger.repository';

describe('TokenLedgerRepository', () => {
  it('sums finalized token totals over an inclusive UTC date range', async () => {
    const aggregate = jest.fn().mockResolvedValue({ _sum: { totalTokens: 4321 } });
    const repository = new TokenLedgerRepository({ tokenUsageLedger: { aggregate } } as never);

    await expect(
      repository.sumTotalTokens({
        userId: 'user-1',
        fromDate: '2026-07-27',
        throughDate: '2026-08-01',
      }),
    ).resolves.toBe(4321);

    expect(aggregate).toHaveBeenCalledWith({
      _sum: { totalTokens: true },
      where: {
        userId: 'user-1',
        date: { gte: '2026-07-27', lte: '2026-08-01' },
      },
    });
  });
});
