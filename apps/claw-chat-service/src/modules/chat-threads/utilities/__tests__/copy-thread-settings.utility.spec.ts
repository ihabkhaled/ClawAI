import { copyThreadSettings } from '../copy-thread-settings.utility';
import type { ChatThread } from '../../../../generated/prisma';

function thread(overrides: Partial<ChatThread> = {}): ChatThread {
  return {
    id: 'thread-1',
    userId: 'user-1',
    title: null,
    routingMode: 'AUTO',
    systemPrompt: null,
    temperature: 0.7,
    maxTokens: null,
    preferredProvider: null,
    preferredModel: null,
    contextPackIds: [],
    useMemory: true,
    useContext: true,
    useCrossThreadContext: true,
    repositoryRef: null,
    ...overrides,
  } as ChatThread;
}

describe('copyThreadSettings repository reference (F095)', () => {
  it('carries the repository reference onto a branch: it is the same conversation', () => {
    const copy = copyThreadSettings(
      thread({
        repositoryRef: {
          name: 'claw',
          remoteUrl: 'https://github.com/acme/claw',
          branch: 'main',
        },
      }),
    );
    expect(copy.repositoryRef).toEqual({
      name: 'claw',
      remoteUrl: 'https://github.com/acme/claw',
      branch: 'main',
    });
  });

  it('omits the field for a thread that has none, rather than writing null', () => {
    expect('repositoryRef' in copyThreadSettings(thread())).toBe(false);
  });

  it('drops a stored value that no longer parses instead of copying junk', () => {
    const copy = copyThreadSettings(thread({ repositoryRef: { name: 42 } }));
    expect('repositoryRef' in copy).toBe(false);
  });
});
