import { buildUserMessageMetadata } from '../user-message-metadata.utility';
import type { CreateMessageDto } from '../../dto/create-message.dto';
import type { ResearchRunResponse } from '../../types/research.types';

const dtoOf = (overrides: Partial<CreateMessageDto> = {}): CreateMessageDto =>
  ({ threadId: 't1', content: 'hi', ...overrides }) as CreateMessageDto;

describe('buildUserMessageMetadata', () => {
  it('is undefined for an ordinary message', () => {
    expect(buildUserMessageMetadata(dtoOf(), null)).toBeUndefined();
    expect(buildUserMessageMetadata(dtoOf({ fileIds: [], clientIntent: '' }), null, [])).toBe(
      undefined,
    );
  });

  it('carries quotes, intent, files, display name and save mode', () => {
    const quotes = [{ sourceMessageId: 'm1', sourceRole: 'USER' as const, text: 'q' }];

    const result = buildUserMessageMetadata(
      dtoOf({
        clientIntent: 'edit',
        fileIds: ['f1'],
        modelDisplayName: 'Model X',
        contextSaveMode: 'ASK',
      }),
      null,
      quotes,
    );

    expect(result).toEqual({
      quotes,
      clientIntent: 'edit',
      fileIds: ['f1'],
      modelDisplayName: 'Model X',
      contextSaveMode: 'ASK',
    });
  });

  it('keeps a mask only when there are files', () => {
    expect(buildUserMessageMetadata(dtoOf({ maskFileId: 'mask' }), null)).toBeUndefined();
    expect(buildUserMessageMetadata(dtoOf({ maskFileId: 'mask', fileIds: ['f1'] }), null)).toEqual({
      fileIds: ['f1'],
      maskFileId: 'mask',
    });
  });

  it('keeps plugin mentions only when present', () => {
    const pluginRefs = [{ installId: 'i1', label: 'P' }];

    expect(buildUserMessageMetadata(dtoOf({ pluginRefs: [] }), null)).toBeUndefined();
    expect(buildUserMessageMetadata(dtoOf({ pluginRefs }), null)).toEqual({ pluginRefs });
  });

  it('records the research run', () => {
    const run = { id: 'r1', workflow: 'SEARCH_ONLY', bundle: {} } as ResearchRunResponse;

    expect(buildUserMessageMetadata(dtoOf(), run)).toEqual({
      research: { runId: 'r1', mode: 'SEARCH_ONLY', bundle: {} },
    });
  });
});
