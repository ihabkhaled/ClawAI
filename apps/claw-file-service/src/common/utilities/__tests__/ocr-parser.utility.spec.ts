// Slice D — OCR parser utility unit tests.
//
// tesseract.js is mocked because (a) booting a real worker pool is slow in
// unit tests and (b) we want deterministic recognise results to assert on.
// The mock provides createScheduler + createWorker and tracks calls so we can
// verify worker count, language, timeout behaviour, and confidence math.

import type { OcrExtractionOptions } from '../../types/ocr.types';
import { __resetOcrSchedulerForTests, extractTextFromImage } from '../ocr-parser.utility';

const recognizeJobs: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

const addWorker = jest.fn();
const terminate = jest.fn(async () => {});
const addJob = jest.fn();

const buildRecognizeResult = (
  text: string,
  wordConfidences: number[],
  pageConfidence?: number,
): unknown => ({
  data: {
    text,
    confidence: pageConfidence ?? 100,
    blocks: [
      {
        paragraphs: [
          {
            lines: [
              {
                words: wordConfidences.map((c) => ({ confidence: c })),
              },
            ],
          },
        ],
      },
    ],
  },
});

jest.mock('tesseract.js', () => {
  return {
    createScheduler: jest.fn(() => ({
      addWorker,
      addJob,
      terminate,
    })),
    createWorker: jest.fn(async () => ({ id: 'mock-worker' })),
  };
});

const tesseract = jest.requireMock('tesseract.js') as {
  createScheduler: jest.Mock;
  createWorker: jest.Mock;
};

const DEFAULT_OPTS: OcrExtractionOptions = {
  language: 'eng',
  timeoutMs: 5_000,
  confidenceMin: 0.6,
  workerThreads: 2,
};

describe('extractTextFromImage', () => {
  beforeEach(async () => {
    await __resetOcrSchedulerForTests();
    recognizeJobs.length = 0;
    addWorker.mockClear();
    addJob.mockReset();
    tesseract.createScheduler.mockClear();
    tesseract.createWorker.mockClear();
  });

  it('returns the recognised text and a normalised mean confidence (0..1) for a PNG', async () => {
    addJob.mockImplementation(() =>
      Promise.resolve(buildRecognizeResult('Hello world', [95, 85, 90, 90])),
    );

    const result = await extractTextFromImage(
      Buffer.from('fake-png-bytes'),
      'image/png',
      DEFAULT_OPTS,
    );

    expect(result.text).toBe('Hello world');
    // Mean of [95,85,90,90] = 90 → confidence = 0.9
    expect(result.confidence).toBeCloseTo(0.9, 3);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(tesseract.createScheduler).toHaveBeenCalledTimes(1);
    expect(tesseract.createWorker).toHaveBeenCalledTimes(2);
    expect(tesseract.createWorker).toHaveBeenCalledWith('eng');
  });

  it('reuses the cached scheduler across calls with the same worker count', async () => {
    addJob.mockImplementation(() => Promise.resolve(buildRecognizeResult('text', [80])));

    await extractTextFromImage(Buffer.from('a'), 'image/png', DEFAULT_OPTS);
    await extractTextFromImage(Buffer.from('b'), 'image/png', DEFAULT_OPTS);

    // Only built once even though we extracted twice.
    expect(tesseract.createScheduler).toHaveBeenCalledTimes(1);
    expect(tesseract.createWorker).toHaveBeenCalledTimes(2);
  });

  it('throws a clear OCR-timeout error when recognise exceeds the configured timeout', async () => {
    // Never-resolving job so the timeout wins the race.
    addJob.mockImplementation(() => new Promise(() => {}));

    await expect(
      extractTextFromImage(Buffer.from('img'), 'image/png', {
        ...DEFAULT_OPTS,
        timeoutMs: 30,
      }),
    ).rejects.toThrow(/OCR timed out after 30ms/);
  });

  it('returns text with confidence below the minimum so the manager can flag it (no throw)', async () => {
    addJob.mockImplementation(() =>
      Promise.resolve(buildRecognizeResult('faint text', [40, 35, 30])),
    );

    const result = await extractTextFromImage(Buffer.from('img'), 'image/png', {
      ...DEFAULT_OPTS,
      confidenceMin: 0.7,
    });

    // Mean of [40,35,30] = 35 → 0.35, below the 0.7 threshold but still
    // returned so the caller can decide what to do.
    expect(result.text).toBe('faint text');
    expect(result.confidence).toBeCloseTo(0.35, 3);
    expect(result.confidence).toBeLessThan(0.7);
  });

  it('falls back to page-level confidence when no words were detected', async () => {
    addJob.mockImplementation(() => Promise.resolve(buildRecognizeResult('', [], 72)));

    const result = await extractTextFromImage(Buffer.from('blank'), 'image/png', DEFAULT_OPTS);

    expect(result.text).toBe('');
    // pageConfidence=72 → 0.72.
    expect(result.confidence).toBeCloseTo(0.72, 3);
  });

  it('rethrows recognise errors with the original message', async () => {
    addJob.mockImplementation(() => Promise.reject(new Error('tesseract OOM')));

    await expect(
      extractTextFromImage(Buffer.from('img'), 'image/png', DEFAULT_OPTS),
    ).rejects.toThrow('tesseract OOM');
  });

  it('clamps confidence into [0,1] even when a malformed result exceeds 100', async () => {
    addJob.mockImplementation(() => Promise.resolve(buildRecognizeResult('weird', [250])));

    const result = await extractTextFromImage(Buffer.from('img'), 'image/png', DEFAULT_OPTS);

    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBe(1);
  });
});
