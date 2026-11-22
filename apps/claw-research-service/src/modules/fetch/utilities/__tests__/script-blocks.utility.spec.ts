import { listScriptBlocks } from '../script-blocks.utility';
import { decodeReactRouterStream } from '../turbo-stream.utility';

describe('listScriptBlocks', () => {
  it('returns script bodies and attributes in document order, case-insensitively', () => {
    const html =
      '<p>x</p><SCRIPT type="application/json">{"a":1}</SCRIPT><script>var b=2;</script><scripts>no</scripts>';
    expect(listScriptBlocks(html)).toEqual([
      { attributes: ' type="application/json"', body: '{"a":1}' },
      { attributes: '', body: 'var b=2;' },
    ]);
  });

  it('stays linear on a hostile page with many openers and no closer', () => {
    const hostile = '<script>'.repeat(200_000);
    const started = performance.now();
    expect(listScriptBlocks(hostile)).toEqual([]);
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it('caps the number of blocks it returns', () => {
    const many = '<script>x</script>'.repeat(2000);
    expect(listScriptBlocks(many)).toHaveLength(500);
  });
});

describe('decodeReactRouterStream', () => {
  it('reads enqueue string literals with escapes and stays linear without a closing quote', () => {
    const literal = JSON.stringify(`${JSON.stringify([{ _1: 2 }, 'title', 'Hello "world"'])}\n`);
    const html = `<script>streamController.enqueue(${literal});</script>`;
    expect(decodeReactRouterStream(html)).toEqual({ title: 'Hello "world"' });

    const hostile = `streamController.enqueue("${'a'.repeat(1_000_000)}`;
    const started = performance.now();
    expect(decodeReactRouterStream(hostile)).toBeNull();
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
