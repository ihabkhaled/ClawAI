import { describe, expect, it } from 'vitest';
import { safeBundlePath } from '../zip-bundle.utility';

const WINDOWS_HINT = ['C:', 'Windows', 'win.ini'].join(String.fromCharCode(92));

describe('safeBundlePath', () => {
  it.each([
    ['../../etc/cron.d/x.sh', null],
    ['src/../../evil.py', null],
    ['/etc/app.py', 'etc/app.py'],
    [WINDOWS_HINT, 'Windows/win.ini'],
    ['.env.py', 'env.py'],
    ['no file here', null],
    ['see `lib/util.go`', 'lib/util.go'],
    ['`lib.v1/app.py`', 'lib.v1/app.py'],
    ['File: main.py', 'main.py'],
  ])('hint %j → %j', (hint, expected) => {
    expect(safeBundlePath(hint)).toBe(expected);
  });

  it('stays fast on a long adversarial hint', () => {
    const started = Date.now();
    safeBundlePath(`${'a/'.repeat(30_000)}!`);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
