import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CREDIT_POLICY_MAX_PAGES } from '@/constants/model-billing.constants';

const getConnectors = vi.fn();

vi.mock('@/repositories/connectors/connector.repository', () => ({
  connectorRepository: {
    getConnectors: (...args: unknown[]) => getConnectors(...args),
  },
}));

const { fetchAllConnectorsForCreditPolicy } = await import('../connector-credit-policy.service');

const page = (ids: string[], totalPages: number) => ({
  data: ids.map((id) => ({ id })),
  meta: { total: ids.length, page: 1, limit: 100, totalPages },
});

describe('fetchAllConnectorsForCreditPolicy', () => {
  beforeEach(() => getConnectors.mockReset());

  // GET /connectors defaults to 20 rows: one call silently dropped connectors
  // from the roll-up and could show a credit model as "Included".
  it('requests the max page size and follows every page', async () => {
    getConnectors.mockResolvedValueOnce(page(['a', 'b'], 2)).mockResolvedValueOnce(page(['c'], 2));

    const all = await fetchAllConnectorsForCreditPolicy();

    expect(all.map((c) => c.id)).toEqual(['a', 'b', 'c']);
    expect(getConnectors).toHaveBeenNthCalledWith(1, { page: '1', limit: '100' });
    expect(getConnectors).toHaveBeenNthCalledWith(2, { page: '2', limit: '100' });
  });

  it('stops at the page bound even when totalPages is wrong', async () => {
    getConnectors.mockResolvedValue(page(['x'], 9999));

    await fetchAllConnectorsForCreditPolicy();

    expect(getConnectors).toHaveBeenCalledTimes(CREDIT_POLICY_MAX_PAGES);
  });
});
