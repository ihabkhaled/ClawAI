import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AssistantModelRole, RouterProvider } from '../../../generated/prisma';
import { ASSISTANT_MODEL_SEED_ENTRIES } from '../constants/assistant-model-seed.constants';

describe('assistant model seed', () => {
  it('orders the research gate candidates uniquely and contiguously from 1', () => {
    const orders = ASSISTANT_MODEL_SEED_ENTRIES.filter(
      (entry) => entry.role === AssistantModelRole.RESEARCH_GATE,
    ).map((entry) => entry.order);

    expect(new Set(orders).size).toBe(orders.length);
    expect([...orders].sort((a, b) => a - b)).toEqual(
      Array.from({ length: orders.length }, (_, index) => index + 1),
    );
  });

  // The gate fails closed: a candidate it cannot reach answers "no web". A
  // local model first on a production box that runs no local Ollama therefore
  // does not fail loudly, it silently turns automatic research off.
  it('tries a cloud model before the local one', () => {
    const gate = ASSISTANT_MODEL_SEED_ENTRIES.filter(
      (entry) => entry.role === AssistantModelRole.RESEARCH_GATE,
    ).sort((left, right) => left.order - right.order);

    expect(gate[0]?.provider).toBe(RouterProvider.OLLAMA_CLOUD);

    const firstLocal = gate.findIndex((entry) => entry.provider === RouterProvider.OLLAMA);
    const firstCloud = gate.findIndex((entry) => entry.provider === RouterProvider.OLLAMA_CLOUD);
    expect(firstCloud).toBeLessThan(firstLocal);
  });

  // It runs before EVERY reply, including the ones that need nothing, so its
  // budget is paid on messages that gain nothing from it.
  it('keeps every research-gate candidate cheap', () => {
    for (const entry of ASSISTANT_MODEL_SEED_ENTRIES.filter(
      (candidate) => candidate.role === AssistantModelRole.RESEARCH_GATE,
    )) {
      expect(entry.maxTokens).toBeLessThanOrEqual(128);
      expect(entry.timeoutMs).toBeLessThanOrEqual(10_000);
    }
  });

  // A file is a whole document: a gate-sized budget would cut every file off.
  // Hosted first, because production runs no local Ollama.
  it('gives file writers a document-sized budget, hosted models first', () => {
    const writers = ASSISTANT_MODEL_SEED_ENTRIES.filter(
      (candidate) => candidate.role === AssistantModelRole.FILE_WRITER,
    );
    expect(writers.length).toBeGreaterThanOrEqual(2);
    expect(writers[0]?.provider).toBe(RouterProvider.OLLAMA_CLOUD);
    for (const entry of writers) {
      expect(entry.maxTokens).toBeGreaterThanOrEqual(4_096);
    }
  });

  // The order is measured, not guessed: each of these wrote 100/100 files in
  // the F4 matrix, fastest first (docs/09-testing/file-model-matrix.md,
  // ADR-111). The previous list led with gpt-oss:120b (94/100) and had
  // glm-5.3 second, which is not exposed and could never run as a fallback.
  // Changing this list means re-running the matrix.
  it('seeds the file writers the matrix measured at 100/100, fastest first', () => {
    const writers = ASSISTANT_MODEL_SEED_ENTRIES.filter(
      (candidate) => candidate.role === AssistantModelRole.FILE_WRITER,
    );

    expect(writers.map((entry) => entry.modelAlias)).toEqual([
      'gemma4:31b',
      'qwen3.5:397b',
      'glm-5.1',
    ]);
    expect(writers.map((entry) => entry.order)).toEqual([1, 2, 3]);
  });

  // ADR-120 batch 5: a lane that cannot see gets a helper's description. Gemini
  // first because it is the connector a typical install has; both are hosted
  // vision models, and the budget is a description's, not a document's.
  it('seeds a bounded vision helper, Gemini first then OpenAI', () => {
    const helpers = ASSISTANT_MODEL_SEED_ENTRIES.filter(
      (candidate) => candidate.role === AssistantModelRole.VISION_HELPER,
    );

    expect(helpers.map((entry) => [entry.order, entry.provider, entry.modelAlias])).toEqual([
      [1, RouterProvider.GEMINI, 'gemini-2.5-flash'],
      [2, RouterProvider.OPENAI, 'gpt-4.1-mini'],
    ]);
    for (const entry of helpers) {
      expect(entry.maxTokens).toBeLessThanOrEqual(2_048);
      expect(entry.timeoutMs).toBeLessThanOrEqual(60_000);
    }
  });

  // A new enum value is a Postgres ALTER TYPE; without the migration every
  // replica's boot seed fails on an unknown enum label.
  it('ships the migration that adds the VISION_HELPER role', () => {
    const sql = readFileSync(
      join(
        __dirname,
        '../../../../prisma/migrations/20260925150000_add_vision_helper_role/migration.sql',
      ),
      'utf8',
    );
    expect(sql).toContain(
      `ALTER TYPE "AssistantModelRole" ADD VALUE IF NOT EXISTS 'VISION_HELPER'`,
    );
  });
});
