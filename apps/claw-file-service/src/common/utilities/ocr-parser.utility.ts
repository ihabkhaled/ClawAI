// Slice D backend 3 — OCR pipeline utility (wraps tesseract.js).
//
// This is the ONLY file in claw-file-service permitted to import tesseract.js
// directly (third-party isolation rule). The utility exposes a single
// extractTextFromImage entry-point that:
//
//   1. Lazily spins up a singleton scheduler with N tesseract workers (N is
//      bounded by OCR_WORKER_THREADS in AppConfig). The scheduler load-balances
//      jobs across the workers and is shared by every call.
//   2. Races the recognize job against a configurable timeout. On timeout we
//      throw, but the worker stays alive in the pool for the next call.
//   3. Computes a normalised confidence (0..1) as the mean of all word-level
//      confidence scores in the page. Falls back to the page-level confidence
//      if no words were detected. Returns the value even when below the
//      caller's minimum — the manager decides what to do with low-confidence
//      OCR text (e.g. still chunk it but flag it in metadata).
//
// All gated behind AppConfig.OCR_ENABLED at the call site. This module does
// not consult config — it is a pure function library.

import { Logger } from '@nestjs/common';
import { createScheduler, createWorker, type Scheduler } from 'tesseract.js';
import { type OcrExtractionOptions, type OcrExtractionResult } from '../types/ocr.types';

const logger = new Logger('OcrParserUtility');

let cachedScheduler: Scheduler | undefined;
let cachedWorkerCount = 0;

async function getScheduler(workerCount: number, language: string): Promise<Scheduler> {
  if (cachedScheduler && cachedWorkerCount === workerCount) {
    return cachedScheduler;
  }
  logger.debug(
    `getScheduler: building scheduler workers=${String(workerCount)} language=${language}`,
  );
  const scheduler = createScheduler();
  for (let i = 0; i < workerCount; i += 1) {
    const worker = await createWorker(language);
    scheduler.addWorker(worker);
  }
  cachedScheduler = scheduler;
  cachedWorkerCount = workerCount;
  return scheduler;
}

function computeAverageConfidence(
  pageConfidence: number,
  words: Array<{ confidence: number }>,
): number {
  if (words.length === 0) {
    return Math.max(0, Math.min(1, pageConfidence / 100));
  }
  const total = words.reduce((acc, w) => acc + w.confidence, 0);
  const mean = total / words.length;
  // Tesseract.js reports confidence on a 0..100 scale. Clamp to the [0,1]
  // fraction the caller expects.
  return Math.max(0, Math.min(1, mean / 100));
}

async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`OCR timed out after ${String(timeoutMs)}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function extractTextFromImage(
  filePathOrBuffer: string | Buffer,
  mimeType: string,
  opts: OcrExtractionOptions,
): Promise<OcrExtractionResult> {
  const start = Date.now();
  logger.debug(
    `extractTextFromImage: mimeType=${mimeType} language=${opts.language} timeoutMs=${String(opts.timeoutMs)} workers=${String(opts.workerThreads)}`,
  );
  try {
    const scheduler = await getScheduler(opts.workerThreads, opts.language);
    const job = scheduler.addJob('recognize', filePathOrBuffer);
    const result = await runWithTimeout(job, opts.timeoutMs);
    const page = result.data;
    const allWords = (page.blocks ?? []).flatMap((b) =>
      b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)),
    );
    const confidence = computeAverageConfidence(page.confidence, allWords);
    const durationMs = Date.now() - start;
    logger.debug(
      `extractTextFromImage: completed chars=${String(page.text.length)} confidence=${confidence.toFixed(2)} durationMs=${String(durationMs)}`,
    );
    if (confidence < opts.confidenceMin) {
      logger.warn(
        `extractTextFromImage: low confidence ${confidence.toFixed(2)} < ${opts.confidenceMin.toFixed(2)} (caller may discard)`,
      );
    }
    return { text: page.text, confidence, durationMs };
  } catch (error) {
    const durationMs = Date.now() - start;
    logger.error(
      `extractTextFromImage: failed mimeType=${mimeType} durationMs=${String(durationMs)} — ${(error as Error).message}`,
    );
    throw error;
  }
}

// Test-only — lets unit tests reset the singleton worker pool between cases.
export async function __resetOcrSchedulerForTests(): Promise<void> {
  if (cachedScheduler) {
    await cachedScheduler.terminate();
  }
  cachedScheduler = undefined;
  cachedWorkerCount = 0;
}
