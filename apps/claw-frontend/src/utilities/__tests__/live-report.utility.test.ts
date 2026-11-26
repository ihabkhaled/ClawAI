import { describe, expect, it } from 'vitest';

import { parseLiveReportBody } from '@/utilities/live-report.utility';

describe('parseLiveReportBody', () => {
  it('reads sections with headings and timed lines', () => {
    const body = [
      'Summary\nA cooking video.',
      'Chapters\n0:00 Intro\n1:02:03 Baking',
      'Moment by moment\n0:00 — The host says hello.\n0:44 — She cracks two eggs.',
    ].join('\n\n');
    expect(parseLiveReportBody(body)).toEqual([
      { title: 'Summary', lines: [{ clock: null, text: 'A cooking video.' }] },
      {
        title: 'Chapters',
        lines: [
          { clock: '0:00', text: 'Intro' },
          { clock: '1:02:03', text: 'Baking' },
        ],
      },
      {
        title: 'Moment by moment',
        lines: [
          { clock: '0:00', text: 'The host says hello.' },
          { clock: '0:44', text: 'She cracks two eggs.' },
        ],
      },
    ]);
  });

  it('reads an Arabic report and a one-line block as an untitled paragraph', () => {
    const sections = parseLiveReportBody('الملخص\nنص\n\n0:44 — غناء');
    expect(sections[0]?.title).toBe('الملخص');
    expect(sections[1]).toEqual({ title: '', lines: [{ clock: '0:44', text: 'غناء' }] });
    expect(parseLiveReportBody('  \n\n ')).toEqual([]);
  });
});
