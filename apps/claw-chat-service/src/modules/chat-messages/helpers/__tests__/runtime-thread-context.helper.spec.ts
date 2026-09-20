import { latestUserFileIds, runtimeThreadSettings } from '../runtime-thread-context.helper';
import { RUNTIME_V2_OUTPUT_RESERVE_TOKENS } from '../../constants/runtime-v2-transcript.constants';

import type { RuntimeHistoryMessage } from '../../types/runtime-thread-context.types';

const message = (role: string, metadata: unknown): RuntimeHistoryMessage => ({ role, metadata });

/**
 * What a coding-agent run is allowed to know.
 *
 * Both of these were silently absent: the loop passed a bare token number as
 * its thread settings, so the user's cross-thread choice never arrived, and it
 * passed no file ids at all, so an attachment handed to the agent was never
 * analysed while the same file in ordinary chat was.
 */
describe('runtimeThreadSettings', () => {
  it("carries the thread's cross-thread choice, which used to be dropped", () => {
    // The assembler tests `useCrossThreadContext === true`, so an undefined
    // value is a silent no. That is why the same account got cross-thread
    // memory in chat and not in the agent.
    expect(runtimeThreadSettings({ useCrossThreadContext: true }).useCrossThreadContext).toBe(true);
    expect(runtimeThreadSettings({ useCrossThreadContext: false }).useCrossThreadContext).toBe(
      false,
    );
  });

  it('reserves an answer-sized output budget, not the context budget', () => {
    // maxTokens is the ANSWER length and feeds reservedOutputTokens alone
    // (ADR-086). Passing the 96,000-token context budget reserved the
    // resolver's 32,768 ceiling for what is usually a single tool call.
    expect(runtimeThreadSettings(null).maxTokens).toBe(RUNTIME_V2_OUTPUT_RESERVE_TOKENS);
    expect(RUNTIME_V2_OUTPUT_RESERVE_TOKENS).toBeLessThan(32_768);
  });

  it("passes the thread's system prompt when it has one, and omits it when it does not", () => {
    expect(runtimeThreadSettings({ systemPrompt: 'be terse' }).systemPrompt).toBe('be terse');
    expect('systemPrompt' in runtimeThreadSettings({ systemPrompt: null })).toBe(false);
  });

  it('works for a run whose thread could not be loaded', () => {
    expect(runtimeThreadSettings(null)).toEqual({ maxTokens: RUNTIME_V2_OUTPUT_RESERVE_TOKENS });
  });
});

describe('latestUserFileIds', () => {
  it('takes the attachments of the most recent user turn', () => {
    const history = [
      message('USER', { fileIds: ['file-old'] }),
      message('ASSISTANT', null),
      message('USER', { fileIds: ['file-new'] }),
    ];

    expect(latestUserFileIds(history)).toEqual(['file-new']);
  });

  it('ignores an assistant turn that carries file ids', () => {
    const history = [
      message('USER', { fileIds: ['file-asked-about'] }),
      message('ASSISTANT', { fileIds: ['file-produced'] }),
    ];

    expect(latestUserFileIds(history)).toEqual(['file-asked-about']);
  });

  it('returns undefined rather than an empty list when nothing was attached', () => {
    // The assembler treats undefined as "no attachment step"; an empty array
    // would send it looking up nothing.
    expect(latestUserFileIds([message('USER', null)])).toBeUndefined();
    expect(latestUserFileIds([message('USER', { fileIds: [] })])).toBeUndefined();
    expect(latestUserFileIds([])).toBeUndefined();
  });

  it('ignores a fileIds value that is not a list', () => {
    expect(latestUserFileIds([message('USER', { fileIds: 'file-1' })])).toBeUndefined();
  });
});
