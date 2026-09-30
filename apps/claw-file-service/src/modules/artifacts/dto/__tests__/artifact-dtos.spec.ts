import { listArtifactsQuerySchema, publicArtifactParamSchema } from '../artifact-params.dto';
import { publishArtifactSchema } from '../publish-artifact.dto';

const valid = {
  filename: 'report.md',
  mimeType: 'text/markdown',
  content: '# hi',
  sha256: 'a'.repeat(64),
};

describe('publishArtifactSchema', () => {
  it('accepts the exact body the coding agent sends', () => {
    expect(publishArtifactSchema.safeParse({ ...valid, title: 'Report' }).success).toBe(true);
    expect(publishArtifactSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['a path in the filename', { filename: '../x.md' }],
    ['an unknown mime type', { mimeType: 'application/javascript' }],
    ['empty content', { content: '' }],
    ['an upper-case hash', { sha256: 'A'.repeat(64) }],
    ['a short hash', { sha256: 'a'.repeat(63) }],
    ['an unknown field', { owner: 'someone-else' }],
  ])('refuses %s', (_label, patch) => {
    expect(publishArtifactSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});

describe('publicArtifactParamSchema', () => {
  it('accepts a 32-char base64url id and refuses anything else', () => {
    expect(publicArtifactParamSchema.safeParse({ publicId: `${'a_-'.repeat(10)}ab` }).success).toBe(
      true,
    );
    expect(publicArtifactParamSchema.safeParse({ publicId: 'a'.repeat(31) }).success).toBe(false);
    expect(publicArtifactParamSchema.safeParse({ publicId: `${'a'.repeat(31)}/` }).success).toBe(
      false,
    );
  });
});

describe('listArtifactsQuerySchema', () => {
  it('defaults and bounds pagination', () => {
    expect(listArtifactsQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(listArtifactsQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });
});
