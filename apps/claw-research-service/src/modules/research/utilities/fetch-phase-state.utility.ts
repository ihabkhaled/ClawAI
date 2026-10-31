import type {
  EvidenceFetchReportEntry,
  EvidenceFetchSummary,
  FetchBatchOutcome,
} from '../types/fetch-batch.types';

/**
 * Collects what the fetch batches of ONE run did (ADR-211) so the bundle can
 * say, per URL, how each page ended, and prove the pages overlapped:
 * `wallMs` is first start to last end, `sumMs` the added-up page durations.
 */
export class FetchPhaseState {
  private readonly report: EvidenceFetchReportEntry[] = [];
  private firstStart: number | null = null;
  private lastEnd: number | null = null;
  private sumMs = 0;
  private ok = 0;

  record(outcomes: ReadonlyArray<FetchBatchOutcome<unknown>>, origin: 'user' | 'search'): void {
    for (const outcome of outcomes) {
      const durationMs =
        outcome.startedAt !== null && outcome.endedAt !== null
          ? outcome.endedAt - outcome.startedAt
          : null;
      this.report.push({ url: outcome.url, origin, status: outcome.status, durationMs });
      this.ok += outcome.status === 'OK' ? 1 : 0;
      this.sumMs += durationMs ?? 0;
      if (outcome.startedAt !== null) {
        this.firstStart = Math.min(this.firstStart ?? outcome.startedAt, outcome.startedAt);
      }
      if (outcome.endedAt !== null) {
        this.lastEnd = Math.max(this.lastEnd ?? outcome.endedAt, outcome.endedAt);
      }
    }
  }

  /** Additive bundle fields; empty when this run opened no page. */
  bundleFields(): {
    fetchReport?: EvidenceFetchReportEntry[];
    fetchSummary?: EvidenceFetchSummary;
  } {
    if (this.report.length === 0) {
      return {};
    }
    const wallMs =
      this.firstStart !== null && this.lastEnd !== null ? this.lastEnd - this.firstStart : 0;
    return {
      fetchReport: this.report,
      fetchSummary: {
        attempted: this.report.length,
        ok: this.ok,
        wallMs,
        sumMs: this.sumMs,
      },
    };
  }
}
