import { vi } from 'vitest';
import { SaveToContextManager } from '../save-to-context.manager';
import {
  SAVE_MEMORY_FROM_CHAT_PATH,
  SAVE_PACK_FROM_CHAT_PATH,
} from '../../constants/save-to-context.constants';

const { httpRequest } = vi.hoisted(() => ({ httpRequest: vi.fn() }));

vi.mock('../../../../common/utilities', () => ({
  buildInterServiceAuthHeader: vi.fn(() => 'Service t'),
  httpRequest,
}));
vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: () => ({ MEMORY_SERVICE_URL: 'http://memory' }) },
}));

const message = (id: string, role: 'USER' | 'ASSISTANT', content: string) =>
  ({ id, role, content, threadId: 't1' }) as never;

describe('SaveToContextManager (owner feature 11)', () => {
  beforeEach(() => {
    httpRequest.mockReset();
  });

  it('returns null for an ordinary message and calls nothing', async () => {
    const result = await new SaveToContextManager().trySave('u1', 't1', [
      message('m1', 'USER', 'What do you remember about me?'),
    ]);
    expect(result).toBeNull();
    expect(httpRequest).not.toHaveBeenCalled();
  });

  it('saves an INSTRUCTION memory, owner-scoped, keyed on the user message', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        memory: { id: 'mem-1', type: 'INSTRUCTION', content: 'always answer in British English.' },
        created: true,
      },
    });
    const result = await new SaveToContextManager().trySave('u1', 't1', [
      message('m1', 'USER', 'Remember this: always answer in British English.'),
    ]);
    const call = httpRequest.mock.calls[0]?.[0] as {
      url: string;
      headers: Record<string, string>;
      body: Record<string, unknown>;
    };
    expect(call.url).toBe(`http://memory${SAVE_MEMORY_FROM_CHAT_PATH}`);
    expect(call.headers.Authorization).toBe('Service t');
    expect(call.body).toEqual({
      userId: 'u1',
      type: 'INSTRUCTION',
      content: 'always answer in British English.',
      sourceThreadId: 't1',
      sourceMessageId: 'm1',
    });
    expect(result).toMatchObject({ kind: 'MEMORY', memoryId: 'mem-1', created: true });
  });

  it('saves a pasted document as a named context pack', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { created: true, packId: 'p1', name: 'MYONCARE QA CONTEXT PACK' },
    });
    const doc = '# MYONCARE QA CONTEXT PACK\n\nDocumentation Date cannot be in the future.';
    const result = await new SaveToContextManager().trySave('u1', 't1', [
      message('m2', 'USER', `Add this to my context pack:\n\n${doc}`),
    ]);
    const call = httpRequest.mock.calls[0]?.[0] as { url: string; body: Record<string, unknown> };
    expect(call.url).toBe(`http://memory${SAVE_PACK_FROM_CHAT_PATH}`);
    expect(call.body).toEqual({
      userId: 'u1',
      name: 'MYONCARE QA CONTEXT PACK',
      content: doc,
      sourceMessageId: 'm2',
    });
    expect(result).toMatchObject({ kind: 'PACK', packId: 'p1', size: doc.length });
  });

  it('"save this as memory" alone saves the message before it', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        memory: { id: 'mem-2', type: 'FACT', content: 'Our release train leaves every Thursday.' },
      },
    });
    await new SaveToContextManager().trySave('u1', 't1', [
      message('m1', 'ASSISTANT', 'Our release train leaves every Thursday.'),
      message('m3', 'USER', 'save this as memory'),
    ]);
    const call = httpRequest.mock.calls[0]?.[0] as { body: Record<string, unknown> };
    expect(call.body['content']).toBe('Our release train leaves every Thursday.');
    expect(call.body['sourceMessageId']).toBe('m3');
  });

  it('asks when there is nothing to save', async () => {
    const result = await new SaveToContextManager().trySave('u1', 't1', [
      message('m1', 'USER', 'save this as memory'),
    ]);
    expect(result).toEqual({ kind: 'ASK' });
    expect(httpRequest).not.toHaveBeenCalled();
  });

  it.each([
    ['PLAN_FEATURE_DISABLED', 'PLAN'],
    ['PLAN_MEMORY_ITEM_LIMIT_EXCEEDED', 'LIMIT'],
    ['SOMETHING_ELSE', 'UNAVAILABLE'],
  ])('maps memory-service error %s to %s', async (code, reason) => {
    httpRequest.mockResolvedValue({ ok: false, status: 403, data: { code } });
    const result = await new SaveToContextManager().trySave('u1', 't1', [
      message('m1', 'USER', 'Remember this: my team has 6 QA engineers.'),
    ]);
    expect(result).toEqual({ kind: 'FAILED', reason });
  });

  it('reports UNAVAILABLE when memory-service is unreachable', async () => {
    httpRequest.mockImplementation(async () => {
      throw new TypeError('fetch failed');
    });
    const result = await new SaveToContextManager().trySave('u1', 't1', [
      message('m1', 'USER', 'Remember this: my team has 6 QA engineers.'),
    ]);
    expect(result).toEqual({ kind: 'FAILED', reason: 'UNAVAILABLE' });
  });
});
