import { describe, expect, it } from 'vitest';

import { uploadFileSchema } from '@/lib/validation/file.schema';

const MAX_FILE_SIZE_BYTES = 52428800; // 50 MB

describe('uploadFileSchema', () => {
  const validInput = {
    filename: 'document.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
  };

  it('accepts valid file metadata', () => {
    const result = uploadFileSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  // ---------- filename ----------

  it('rejects empty filename', () => {
    const result = uploadFileSchema.safeParse({
      ...validInput,
      filename: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Filename is required');
    }
  });

  it('rejects filename exceeding 255 characters', () => {
    const result = uploadFileSchema.safeParse({
      ...validInput,
      filename: 'f'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it('accepts filename at exact max length (255)', () => {
    const result = uploadFileSchema.safeParse({
      ...validInput,
      filename: 'f'.repeat(255),
    });
    expect(result.success).toBe(true);
  });

  // ---------- mimeType ----------

  it('rejects empty mimeType', () => {
    const result = uploadFileSchema.safeParse({
      ...validInput,
      mimeType: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('MIME type is required');
    }
  });

  it('rejects mimeType exceeding 100 characters', () => {
    const result = uploadFileSchema.safeParse({
      ...validInput,
      mimeType: 'm'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  // ---------- sizeBytes ----------

  it('rejects zero-byte file', () => {
    const result = uploadFileSchema.safeParse({
      ...validInput,
      sizeBytes: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('File must not be empty');
    }
  });

  it('rejects negative file size', () => {
    const result = uploadFileSchema.safeParse({
      ...validInput,
      sizeBytes: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects file exceeding 50 MB', () => {
    const result = uploadFileSchema.safeParse({
      ...validInput,
      sizeBytes: MAX_FILE_SIZE_BYTES + 1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('File must be at most 50 MB');
    }
  });

  it('accepts file at exactly 50 MB', () => {
    const result = uploadFileSchema.safeParse({
      ...validInput,
      sizeBytes: MAX_FILE_SIZE_BYTES,
    });
    expect(result.success).toBe(true);
  });

  it('accepts minimum valid file (1 byte)', () => {
    const result = uploadFileSchema.safeParse({
      ...validInput,
      sizeBytes: 1,
    });
    expect(result.success).toBe(true);
  });

  // ---------- missing fields ----------

  it('rejects missing filename', () => {
    const { filename: _, ...rest } = validInput;
    const result = uploadFileSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing mimeType', () => {
    const { mimeType: _, ...rest } = validInput;
    const result = uploadFileSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing sizeBytes', () => {
    const { sizeBytes: _, ...rest } = validInput;
    const result = uploadFileSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects non-number sizeBytes', () => {
    const result = uploadFileSchema.safeParse({
      ...validInput,
      sizeBytes: '1024',
    });
    expect(result.success).toBe(false);
  });
});
