import {
  chunkMarkdown,
  fitFileTextsByRelevance,
  fitTextsByRelevance,
} from '../relevant-chunks.utility';
import {
  FILE_RELEVANCE_FIT_NOTE_PREFIX,
  TEXT_BUDGET_SHORTENED_MARKER,
} from '../../constants/evidence-fit.constants';
import { RELEVANT_CHUNK_GAP_MARKER } from '../../constants/relevant-chunks.constants';

const PREAMBLE = [
  '# MYONCARE QA CONTEXT PACK',
  '',
  "The user's name is Ihab. He works in software QA on the healthcare platform **Myoncare**.",
  '',
].join('\n');

const TARGET_SECTION = [
  '## Documentation Date',
  '',
  'Required. Cannot be future. Must be within selected reporting quarter.',
  '',
  '`Documentation Date is required.`',
  '`Documentation Date cannot be in the future.`',
  '`Documentation Date must fall within the selected quarter.`',
  '',
].join('\n');

function filler(section: number): string {
  return [
    `## Section ${String(section)} — Care pathway wearable sync`,
    '',
    `Wearable devices upload vitals every ${String(section)} minutes. The patient portal shows the`,
    'latest reading, and the care team receives a summary at the end of the shift. Offline',
    'devices queue readings locally and replay them in order when the connection returns.',
    '',
  ].join('\n');
}

/** A realistic spec of roughly `chars` characters with the target section in the middle. */
function bigSpec(chars: number): string {
  const parts: string[] = [PREAMBLE];
  let index = 1;
  let length = PREAMBLE.length;
  let placed = false;
  while (length < chars) {
    const next = !placed && length > chars / 2 ? TARGET_SECTION : filler(index);
    if (next === TARGET_SECTION) placed = true;
    parts.push(next);
    length += next.length;
    index += 1;
  }
  return parts.join('\n');
}

describe('chunkMarkdown', () => {
  it('splits on headings and keeps every character across chunks', () => {
    const spec = bigSpec(20_000);
    const chunks = chunkMarkdown(spec);
    expect(chunks.length).toBeGreaterThan(10);
    expect(chunks.join('')).toBe(spec);
    expect(chunks.some((chunk) => chunk.startsWith('## Documentation Date'))).toBe(true);
  });

  it('splits an over-long section without headings into bounded pieces', () => {
    const wall = 'word '.repeat(4_000);
    const chunks = chunkMarkdown(wall);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('')).toBe(wall);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(2_000);
  });
});

describe('fitTextsByRelevance (owner bug 5)', () => {
  it('returns texts untouched when they fit', () => {
    const result = fitTextsByRelevance(['short one', 'short two'], 1_000, 'anything');
    expect(result).toEqual({ texts: ['short one', 'short two'], dropped: 0 });
  });

  it.each([45_000, 150_000, 250_000])(
    'keeps the exact error message from the middle of a %i-char pack within a 12K budget',
    (size) => {
      const spec = bigSpec(size);
      const result = fitTextsByRelevance(
        [spec],
        12_000,
        'What is the exact error when Documentation Date is in the future?',
      );
      const kept = result.texts[0] ?? '';
      expect(kept.length).toBeLessThanOrEqual(12_000);
      expect(kept).toContain('`Documentation Date cannot be in the future.`');
      // The preamble carries identity facts and is always kept.
      expect(kept).toContain("The user's name is Ihab");
      expect(kept).toContain(RELEVANT_CHUNK_GAP_MARKER);
      expect(result.dropped).toBe(0);
    },
  );

  it('the old head-truncation would have lost the answer (regression guard)', () => {
    const spec = bigSpec(45_000);
    expect(spec.slice(0, 12_000)).not.toContain('Documentation Date cannot be in the future.');
  });

  it('keeps the head of the document when the question matches nothing', () => {
    const spec = bigSpec(45_000);
    const kept = fitTextsByRelevance([spec], 5_000, 'hello there').texts[0] ?? '';
    expect(kept.startsWith('# MYONCARE QA CONTEXT PACK')).toBe(true);
    expect(kept.length).toBeLessThanOrEqual(5_000);
  });

  it('shares the budget across several items and keeps order', () => {
    const a = bigSpec(40_000);
    const b = `# Preferences\n\nAnswer in British English.\n\n${'filler text. '.repeat(3_000)}`;
    const result = fitTextsByRelevance([a, b], 10_000, 'Documentation Date future error');
    expect(result.texts).toHaveLength(2);
    expect(result.texts[0]).toContain('Documentation Date cannot be in the future.');
    expect(result.texts[1]).toContain('Answer in British English.');
    const total = result.texts.reduce((sum, text) => sum + text.length, 0);
    expect(total).toBeLessThanOrEqual(10_000);
  });

  it('matches Arabic questions against Arabic content', () => {
    const arabic = [
      '# ملاحظات',
      '',
      'اسم المستخدم إيهاب.',
      '',
      ...Array.from(
        { length: 200 },
        (_, index) => `## قسم ${String(index)}\n\nنص عام عن المزامنة.\n`,
      ),
      '## تاريخ التوثيق',
      '',
      'لا يمكن أن يكون تاريخ التوثيق في المستقبل.',
      '',
      ...Array.from(
        { length: 200 },
        (_, index) => `## قسم إضافي ${String(index)}\n\nنص عام آخر.\n`,
      ),
    ].join('\n');
    const kept =
      fitTextsByRelevance([arabic], 3_000, 'ما هو الخطأ عندما يكون تاريخ التوثيق في المستقبل؟')
        .texts[0] ?? '';
    expect(kept).toContain('لا يمكن أن يكون تاريخ التوثيق في المستقبل.');
  });
});

describe('fitFileTextsByRelevance (ADR-219 large attachments)', () => {
  const QUESTION = 'What is the exact error when Documentation Date is in the future?';

  it('delivers a file that fits whole, with no note', () => {
    const small = bigSpec(20_000);
    const result = fitFileTextsByRelevance([small], 24_000, 100_000, QUESTION);
    expect(result.texts).toEqual([small]);
    expect(result.dropped).toBe(0);
  });

  it('keeps the middle passage and the opening of a 2M-char file, and says so honestly', () => {
    const huge = bigSpec(2_000_000);
    expect(huge.length).toBeGreaterThanOrEqual(2_000_000);
    const result = fitFileTextsByRelevance([huge], 24_000, 100_000, QUESTION);
    const kept = result.texts[0] ?? '';
    expect(kept.length).toBeLessThanOrEqual(24_000);
    expect(kept).toContain('`Documentation Date cannot be in the future.`');
    expect(kept).toContain('# MYONCARE QA CONTEXT PACK');
    expect(kept).toContain("The user's name is Ihab");
    expect(kept.startsWith(FILE_RELEVANCE_FIT_NOTE_PREFIX)).toBe(true);
    expect(kept).toContain(`of ${huge.length.toLocaleString('en-US')} characters`);
    expect(kept).toContain('Do not claim to have read the whole file');
    expect(kept).not.toContain(TEXT_BUDGET_SHORTENED_MARKER);
  });

  it('fits by relevance over the WHOLE text before the per-file cap (no head-cut first)', () => {
    const huge = bigSpec(400_000);
    // A big window: the file share is larger than the per-file cap.
    const result = fitFileTextsByRelevance([huge], 1_000_000, 100_000, QUESTION);
    const kept = result.texts[0] ?? '';
    expect(kept.length).toBeLessThanOrEqual(100_000);
    expect(huge.slice(0, 100_000)).not.toContain('Documentation Date cannot be in the future.');
    expect(kept).toContain('`Documentation Date cannot be in the future.`');
  });

  it('keeps a small file whole beside a huge one', () => {
    const huge = bigSpec(500_000);
    const small = '# Notes\n\nThe launch is on Tuesday.\n\nNothing else matters here.\n';
    const result = fitFileTextsByRelevance([huge, small], 24_000, 100_000, QUESTION);
    expect(result.texts[1]).toBe(small);
    expect(result.texts[0]).toContain('`Documentation Date cannot be in the future.`');
    const total = result.texts.reduce((sum, text) => sum + text.length, 0);
    expect(total).toBeLessThanOrEqual(24_000);
  });
});
