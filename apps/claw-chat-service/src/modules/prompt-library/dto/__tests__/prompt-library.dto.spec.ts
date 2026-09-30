import {
  createPromptTemplateSchema,
  listPromptTemplatesQuerySchema,
  promptTemplateParamSchema,
  updatePromptTemplateSchema,
} from '../prompt-library.dto';

describe('createPromptTemplateSchema', () => {
  it('trims the title and normalises tags (trim, lowercase, dedupe)', () => {
    const parsed = createPromptTemplateSchema.parse({
      title: '  Weekly report  ',
      body: 'Write {{topic}}',
      tags: [' Work ', 'work', 'WORK', 'Email'],
    });
    expect(parsed.title).toBe('Weekly report');
    expect(parsed.tags).toEqual(['work', 'email']);
    expect(parsed.isFavorite).toBe(false);
  });

  it('defaults tags to an empty list', () => {
    expect(createPromptTemplateSchema.parse({ title: 't', body: 'b' }).tags).toEqual([]);
  });

  it('rejects an empty or oversized title and body', () => {
    expect(createPromptTemplateSchema.safeParse({ title: '   ', body: 'b' }).success).toBe(false);
    expect(
      createPromptTemplateSchema.safeParse({ title: 'x'.repeat(121), body: 'b' }).success,
    ).toBe(false);
    expect(createPromptTemplateSchema.safeParse({ title: 't', body: '' }).success).toBe(false);
    expect(
      createPromptTemplateSchema.safeParse({ title: 't', body: 'x'.repeat(20001) }).success,
    ).toBe(false);
  });

  it('rejects too many tags and bad tag lengths', () => {
    const tags = Array.from({ length: 11 }, (_, i) => `t${i}`);
    expect(createPromptTemplateSchema.safeParse({ title: 't', body: 'b', tags }).success).toBe(
      false,
    );
    expect(
      createPromptTemplateSchema.safeParse({ title: 't', body: 'b', tags: [' '] }).success,
    ).toBe(false);
    expect(
      createPromptTemplateSchema.safeParse({ title: 't', body: 'b', tags: ['x'.repeat(33)] })
        .success,
    ).toBe(false);
  });
});

describe('updatePromptTemplateSchema', () => {
  it('accepts a partial body and rejects an empty patch', () => {
    expect(updatePromptTemplateSchema.safeParse({ isFavorite: true }).success).toBe(true);
    expect(updatePromptTemplateSchema.safeParse({}).success).toBe(false);
  });
});

describe('listPromptTemplatesQuerySchema', () => {
  it('defaults the limit to 30 and caps it at 100', () => {
    expect(listPromptTemplatesQuerySchema.parse({}).limit).toBe(30);
    expect(listPromptTemplatesQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(listPromptTemplatesQuerySchema.parse({ limit: '50' }).limit).toBe(50);
  });

  it('parses favorite and lowercases the tag', () => {
    const parsed = listPromptTemplatesQuerySchema.parse({ favorite: 'true', tag: ' Work ' });
    expect(parsed.favorite).toBe(true);
    expect(parsed.tag).toBe('work');
    expect(listPromptTemplatesQuerySchema.safeParse({ favorite: 'yes' }).success).toBe(false);
  });
});

describe('promptTemplateParamSchema', () => {
  it('requires a uuid', () => {
    expect(promptTemplateParamSchema.safeParse({ id: 'nope' }).success).toBe(false);
    expect(
      promptTemplateParamSchema.safeParse({ id: '3f2b8c1e-6a4d-4f0e-9b1a-2c7d5e8f9a01' }).success,
    ).toBe(true);
  });
});
