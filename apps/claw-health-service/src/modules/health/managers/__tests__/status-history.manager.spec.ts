import { vi } from 'vitest';

import { PrometheusAdapter } from '../../adapters/prometheus.adapter';
import {
  PROMQL_BUCKETS_WITH_DATA,
  PROMQL_FAILING_BUCKETS,
  STATUS_BUCKET_SECONDS,
} from '../../constants/status-page.constants';
import { ComponentState } from '../../enums/component-state.enum';
import { StatusComponent } from '../../enums/status-component.enum';
import { StatusHistoryManager } from '../status-history.manager';

const STEP = STATUS_BUCKET_SECONDS;
const END = 1_800_000_000;

describe('StatusHistoryManager', () => {
  it('asks Prometheus two step-aligned 30-day range questions and builds the history', async () => {
    const adapter = new PrometheusAdapter();
    const queryRange = vi
      .spyOn(adapter, 'queryRange')
      .mockImplementation(async (query) =>
        query === PROMQL_BUCKETS_WITH_DATA
          ? [{ labels: {}, timestamps: [END - STEP, END] }]
          : [{ labels: { service: 'payment-service' }, timestamps: [END] }],
      );

    // 123 s past a bucket boundary: the read must still land on the boundary.
    const history = await new StatusHistoryManager(adapter).read(END * 1000 + 123_000);

    const start = END - 2_592_000 + STEP;
    expect(queryRange).toHaveBeenCalledWith(PROMQL_BUCKETS_WITH_DATA, start, END, STEP);
    expect(queryRange).toHaveBeenCalledWith(PROMQL_FAILING_BUCKETS, start, END, STEP);
    expect(history.incidents).toEqual([
      expect.objectContaining({
        component: StatusComponent.PAYMENTS,
        state: ComponentState.DOWN,
        endedAt: null,
      }),
    ]);
    const payments = history.components.find(
      (entry) => entry.component === StatusComponent.PAYMENTS,
    );
    expect(payments?.uptime[0]?.uptimeBasisPoints).toBe(5_000);
  });

  it('ignores a failing series that carries no service label', async () => {
    const adapter = new PrometheusAdapter();
    vi.spyOn(adapter, 'queryRange').mockImplementation(async (query) =>
      query === PROMQL_BUCKETS_WITH_DATA
        ? [{ labels: {}, timestamps: [END] }]
        : [{ labels: {}, timestamps: [END] }],
    );

    const history = await new StatusHistoryManager(adapter).read(END * 1000);

    expect(history.incidents).toEqual([]);
  });

  it('propagates a Prometheus failure to the caller, which decides what to show', async () => {
    const adapter = new PrometheusAdapter();
    vi.spyOn(adapter, 'queryRange').mockRejectedValue(new Error('timeout'));

    await expect(new StatusHistoryManager(adapter).read(END * 1000)).rejects.toThrow('timeout');
  });
});
