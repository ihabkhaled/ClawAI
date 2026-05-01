import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { computeSha256, verifySha256 } from '../sha256.utility';

describe('Sha256 utility', () => {
  let tempFile: string;

  beforeAll(async () => {
    tempFile = path.join(os.tmpdir(), `sha-test-${Date.now()}.bin`);
    await fs.promises.writeFile(tempFile, 'hello world');
  });

  afterAll(async () => {
    await fs.promises.rm(tempFile, { force: true });
  });

  it('computes SHA-256 of fixture file', async () => {
    const hex = await computeSha256(tempFile);
    expect(hex).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('verify returns true for matching hash', async () => {
    const ok = await verifySha256(tempFile, 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    expect(ok).toBe(true);
  });

  it('verify returns false for mismatching hash', async () => {
    const ok = await verifySha256(tempFile, '0'.repeat(64));
    expect(ok).toBe(false);
  });
});
