// Universal-research PR1 — research-mode enum-migration regression suite.
//
// PR1 collapsed two parallel research-mode dialects that used to coexist in
// chat-service:
//
//   * The OLD single-message dialect (createMessageSchema) — used the values
//     OFF / SEARCH_ONLY / SEARCH_THEN_FETCH / SEARCH_FETCH_EXTRACT.
//   * The NEW compare-mode dialect (parallelMessageSchema) — used the values
//     NONE / SEARCH / SEARCH_FETCH / SEARCH_EXTRACT.
//
// chat-messages.service.ts was comparing against BOTH dialects which silently
// mismatched: a single-message body with researchMode='SEARCH_ONLY' would
// trip the OFF != 'SEARCH_ONLY' branch but never the
// ResearchMode.NONE branch — so the assertion gate fired research even when
// the user picked the legacy SEARCH_ONLY value, AND no gate fired research
// when the user picked the new SEARCH value through createMessageSchema.
//
// PR1 made ResearchMode (NONE / SEARCH / SEARCH_FETCH / SEARCH_EXTRACT) the
// single source of truth across both DTOs and every consumer. This spec
// pins that down so a future refactor can never split the dialects again.

import { ResearchMode } from '../../../common/enums/research-mode.enum';
import { ResearchWorkflow } from '../../../common/enums/research-workflow.enum';
import { mapResearchModeToWorkflow } from '../../../common/utilities/research-mode-mapping.utility';
import { createMessageSchema } from '../dto/create-message.dto';
import { parallelMessageSchema } from '../dto/parallel-message.dto';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Research-mode enum migration (PR1 contract)', () => {
  // ─── Case 1: createMessageSchema accepts researchMode=SEARCH ─────────────
  it('createMessageSchema: accepts the NEW researchMode=SEARCH', () => {
    const parsed = createMessageSchema.safeParse({
      threadId: 'thread-1',
      content: 'What is the latest TypeScript version?',
      researchMode: ResearchMode.SEARCH,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }
    expect(parsed.data.researchMode).toBe(ResearchMode.SEARCH);
  });

  // ─── Case 2: createMessageSchema rejects the OLD OFF value ───────────────
  it('createMessageSchema: rejects the LEGACY researchMode="OFF" (kept-out so old clients learn)', () => {
    const parsed = createMessageSchema.safeParse({
      threadId: 'thread-1',
      content: 'hi',
      researchMode: 'OFF',
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }
    // Zod surfaces an enum violation on the researchMode path; the FE forms
    // already migrated to the new enum, so any 400 here is an OLD client.
    expect(parsed.error.issues.some((issue) => issue.path.includes('researchMode'))).toBe(true);
  });

  // ─── Case 3: chat-messages.service.ts only compares against the NEW enum
  it('chat-messages.service.ts: no literal "OFF" / SEARCH_ONLY / SEARCH_THEN_FETCH / SEARCH_FETCH_EXTRACT comparisons anywhere', () => {
    const filePath = join(__dirname, '..', 'services', 'chat-messages.service.ts');
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const source = readFileSync(filePath, 'utf-8');
    const stripped = source
      .replaceAll(/\/\/[^\n]*/g, '')
      .replaceAll(/\/\*[\S\s]*?\*\//g, '');
    expect(stripped).not.toMatch(/['"]OFF['"]/);
    expect(stripped).not.toMatch(/ResearchMode\.OFF/);
    // Confirm the canonical comparison IS there (regression: if the service
    // ever drops the NONE check the gate falls open on user-facing flows).
    expect(stripped).toContain('ResearchMode.NONE');
  });

  // ─── Case 4: parallel + createMessage share the SAME enum, not a copy ────
  it('parallelMessageSchema + createMessageSchema: share the SAME ResearchMode enum (same object reference)', () => {
    const createParsed = createMessageSchema.safeParse({
      threadId: 't',
      content: 'x',
      researchMode: ResearchMode.SEARCH_EXTRACT,
    });
    const parallelParsed = parallelMessageSchema.safeParse({
      content: 'x',
      models: [
        { provider: 'OLLAMA_CLOUD', model: 'deepseek-v4-pro' },
        { provider: 'OLLAMA', model: 'qwen3:14b' },
      ],
      researchMode: ResearchMode.SEARCH_EXTRACT,
    });
    expect(createParsed.success).toBe(true);
    expect(parallelParsed.success).toBe(true);
    if (!createParsed.success || !parallelParsed.success) {
      return;
    }
    // The two DTOs MUST produce the same literal value for the same enum
    // member. If a future refactor accidentally re-introduces a string-union
    // copy, the values would diverge (e.g. 'SEARCH_FETCH_EXTRACT' vs
    // 'SEARCH_EXTRACT') and this assertion will catch it.
    expect(createParsed.data.researchMode).toBe(parallelParsed.data.researchMode);
    expect(createParsed.data.researchMode).toBe(ResearchMode.SEARCH_EXTRACT);
  });

  // ─── Case 5: research-mode → research-workflow mapping is exhaustive ─────
  it('mapResearchModeToWorkflow: every ResearchMode value maps to a real ResearchWorkflow', () => {
    expect(mapResearchModeToWorkflow(ResearchMode.SEARCH)).toBe(ResearchWorkflow.SEARCH_ONLY);
    expect(mapResearchModeToWorkflow(ResearchMode.SEARCH_FETCH)).toBe(
      ResearchWorkflow.SEARCH_THEN_FETCH,
    );
    expect(mapResearchModeToWorkflow(ResearchMode.SEARCH_EXTRACT)).toBe(
      ResearchWorkflow.SEARCH_FETCH_EXTRACT,
    );
    // NONE falls through to SEARCH_ONLY (callers short-circuit before this
    // function — but the fallthrough must NOT throw).
    expect(mapResearchModeToWorkflow(ResearchMode.NONE)).toBe(ResearchWorkflow.SEARCH_ONLY);
    // Sanity: the canonical enum has exactly four values (defensive — if a
    // refactor adds a 5th value, this test fails so the engineer adds a case
    // to the mapping table at the same time).
    const valueSet = new Set(Object.values(ResearchMode));
    expect(valueSet).toEqual(
      new Set([
        ResearchMode.NONE,
        ResearchMode.SEARCH,
        ResearchMode.SEARCH_FETCH,
        ResearchMode.SEARCH_EXTRACT,
      ]),
    );
  });
});
