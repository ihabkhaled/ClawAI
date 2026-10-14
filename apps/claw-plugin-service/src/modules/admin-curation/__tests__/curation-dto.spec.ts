import { ServerState } from '../../../common/enums/server-status.enum';
import {
  auditQuerySchema,
  createCuratedBodySchema,
  createRuleBodySchema,
  curatedStateBodySchema,
  listCuratedQuerySchema,
  previewCuratedBodySchema,
  rejectServerBodySchema,
  serversQuerySchema,
  updateCuratedBodySchema,
} from '../dto/curation.dto';

const VALID = {
  slug: 'vendor-docs',
  publisher: 'Vendor',
  category: 'dev',
  iconKey: 'code',
  translations: { en: { name: 'Vendor', summary: 'Docs.', description: 'Docs search.' } },
  server: { url: 'https://mcp.vendor.example.com/mcp', transport: 'streamable-http' },
  tools: [{ name: 'search_docs', description: 'Search.', riskLevel: 'READ' }],
};

describe('admin catalog curation: request validation', () => {
  it('accepts a minimal entry and fills defaults (no auth, every plan, not published)', () => {
    const parsed = createCuratedBodySchema.parse(VALID);

    expect(parsed).toMatchObject({
      auth: { kind: 'NONE' },
      allowedPlanSlugs: [],
      publish: false,
    });
  });

  it.each([
    ['an unknown field', { ...VALID, source: 'FIRST_PARTY' }],
    ['a bad slug', { ...VALID, slug: 'Bad Slug' }],
    [
      'a locale that is not one of the 13',
      { ...VALID, translations: { ...VALID.translations, xx: VALID.translations.en } },
    ],
    ['no English text', { ...VALID, translations: { de: VALID.translations.en } }],
    [
      'a name with a bidi override',
      { ...VALID, translations: { en: { ...VALID.translations.en, name: 'a‮b' } } },
    ],
    ['no tools', { ...VALID, tools: [] }],
    ['an upper case tool name', { ...VALID, tools: [{ ...VALID.tools[0], name: 'Search' }] }],
    ['an unknown risk level', { ...VALID, tools: [{ ...VALID.tools[0], riskLevel: 'NONE' }] }],
    ['an unknown transport', { ...VALID, server: { ...VALID.server, transport: 'stdio' } }],
    ['a plan slug with spaces', { ...VALID, allowedPlanSlugs: ['free plan'] }],
    ['a control character in the notes', { ...VALID, adminNotes: 'a\u0007b' }],
    ['an API key without a header name', { ...VALID, auth: { kind: 'API_KEY' } }],
  ])('rejects %s', (_label, body) => {
    expect(createCuratedBodySchema.safeParse(body).success).toBe(false);
  });

  it('the edit body takes no slug', () => {
    const { slug: _slug, ...rest } = VALID;

    expect(updateCuratedBodySchema.safeParse(rest).success).toBe(true);
    expect(updateCuratedBodySchema.safeParse(VALID).success).toBe(false);
  });

  it('validates the preview, state and list bodies', () => {
    expect(
      previewCuratedBodySchema.safeParse({ url: 'https://x.example.com/mcp', transport: 'sse' })
        .success,
    ).toBe(true);
    expect(previewCuratedBodySchema.safeParse({ url: '', transport: 'sse' }).success).toBe(false);
    expect(curatedStateBodySchema.safeParse({ enabled: 'yes' }).success).toBe(false);
    expect(listCuratedQuerySchema.parse({}).includeDeleted).toBe(false);
    expect(listCuratedQuerySchema.parse({ includeDeleted: 'true' }).includeDeleted).toBe(true);
  });

  it('queue filter defaults to pending and takes only a real status', () => {
    expect(serversQuerySchema.parse({}).status).toBe(ServerState.PENDING_APPROVAL);
    expect(serversQuerySchema.safeParse({ status: 'MAYBE' }).success).toBe(false);
  });

  it('a rejection needs a one-line reason of at most 200 characters', () => {
    expect(rejectServerBodySchema.safeParse({ reason: 'Not allowed.' }).success).toBe(true);
    expect(rejectServerBodySchema.safeParse({ reason: '' }).success).toBe(false);
    expect(rejectServerBodySchema.safeParse({ reason: 'x'.repeat(201) }).success).toBe(false);
    expect(rejectServerBodySchema.safeParse({ reason: 'a\nb' }).success).toBe(false);
  });

  it.each([
    ['a host', { kind: 'DENY', match: 'HOST', pattern: 'evil.example.com' }, true],
    ['a wildcard host', { kind: 'DENY', match: 'HOST', pattern: '*.evil.example.com' }, true],
    ['an IP literal as host', { kind: 'DENY', match: 'HOST', pattern: '10.0.0.5' }, false],
    ['a host with a path', { kind: 'DENY', match: 'HOST', pattern: 'evil.example.com/x' }, false],
    ['a slug', { kind: 'ALLOW', match: 'SLUG', pattern: 'weather' }, true],
    ['a bad slug', { kind: 'ALLOW', match: 'SLUG', pattern: 'We ather' }, false],
    ['a publisher', { kind: 'DENY', match: 'PUBLISHER', pattern: 'Acme Corp' }, true],
    ['an unknown kind', { kind: 'MAYBE', match: 'HOST', pattern: 'a.example.com' }, false],
  ])('rule body: %s', (_label, body, ok) => {
    expect(createRuleBodySchema.safeParse(body).success).toBe(ok);
  });

  it('audit query is bounded to 100 rows', () => {
    expect(auditQuerySchema.parse({}).limit).toBe(50);
    expect(auditQuerySchema.parse({ limit: '100' }).limit).toBe(100);
    expect(auditQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });
});
