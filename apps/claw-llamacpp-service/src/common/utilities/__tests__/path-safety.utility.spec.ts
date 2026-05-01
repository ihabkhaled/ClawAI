import * as path from 'node:path';
import { isWithinRoot, resolveSafePath } from '../path-safety.utility';

describe('PathSafety utility', () => {
  const root = path.resolve('/tmp/llamacpp-data');

  it('resolves a safe path inside root', () => {
    const resolved = resolveSafePath(root, 'models/glm-5.1/Q4_K_M');
    expect(resolved.startsWith(root)).toBe(true);
  });

  it('rejects parent-traversal segments', () => {
    expect(() => resolveSafePath(root, '../etc/passwd')).toThrow(/Unsafe path/);
  });

  it('isWithinRoot returns true for sibling subpaths', () => {
    expect(isWithinRoot(root, path.join(root, 'a/b'))).toBe(true);
  });

  it('isWithinRoot returns false for outside paths', () => {
    expect(isWithinRoot(root, '/etc/passwd')).toBe(false);
  });
});
