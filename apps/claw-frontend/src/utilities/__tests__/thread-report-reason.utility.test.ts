import { describe, expect, it } from 'vitest';

import { ThreadPublicationReportReason } from '@/enums/thread-publication-report-reason.enum';

import { parseThreadReportReason } from '../thread-report-reason.utility';

describe('parseThreadReportReason', () => {
  it('accepts every known reason', () => {
    for (const reason of Object.values(ThreadPublicationReportReason)) {
      expect(parseThreadReportReason(reason)).toBe(reason);
    }
  });

  it('rejects anything else, including the wrong case and an empty value', () => {
    expect(parseThreadReportReason('spam')).toBeNull();
    expect(parseThreadReportReason('')).toBeNull();
    expect(parseThreadReportReason('threadPublicReportSPAM')).toBeNull();
  });
});
