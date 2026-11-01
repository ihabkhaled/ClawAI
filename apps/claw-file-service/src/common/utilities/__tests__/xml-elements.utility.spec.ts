import { elementsOf } from '../xml-elements.utility';

describe('elementsOf', () => {
  it('returns each element in document order with its attributes', () => {
    const found = elementsOf('<c r="A1" t="s"><v>0</v></c><c r="B1"><v>7</v></c>', 'c');

    expect(found).toEqual([
      { attributes: ' r="A1" t="s"', inner: '<v>0</v>' },
      { attributes: ' r="B1"', inner: '<v>7</v>' },
    ]);
  });

  it('reads an element with no attributes', () => {
    expect(elementsOf('<t>hello</t>', 't')).toEqual([{ attributes: '', inner: 'hello' }]);
  });

  it('does not take a longer tag name for the one asked for', () => {
    expect(elementsOf('<col min="1"></col><cols><c>x</c></cols>', 'c')).toEqual([
      { attributes: '', inner: 'x' },
    ]);
  });

  it('skips a self-closing element instead of letting it swallow the next one', () => {
    const found = elementsOf('<c r="A1"/><c r="B1"><v>5</v></c>', 'c');

    expect(found).toEqual([{ attributes: ' r="B1"', inner: '<v>5</v>' }]);
  });

  it('ends the scan at an opener that never closes', () => {
    expect(elementsOf('<p>one</p><p>two', 'p')).toEqual([{ attributes: '', inner: 'one' }]);
  });

  it('ends the scan at an opening tag that never ends', () => {
    expect(elementsOf('<p>one</p><p never closed', 'p')).toEqual([
      { attributes: '', inner: 'one' },
    ]);
  });

  it('closes an element at the first matching close tag', () => {
    expect(elementsOf('<p>a<p>b</p>c</p>', 'p')).toEqual([{ attributes: '', inner: 'a<p>b' }]);
  });

  it('keeps a namespaced tag name exact', () => {
    expect(elementsOf('<w:p><w:r/></w:p><w:pPr></w:pPr>', 'w:p')).toEqual([
      { attributes: '', inner: '<w:r/>' },
    ]);
  });

  it('returns nothing for text with no element, or for empty text', () => {
    expect(elementsOf('plain text', 'p')).toEqual([]);
    expect(elementsOf('', 'p')).toEqual([]);
  });

  // The reason this module exists: a lazy-body regex rescans to the end of the
  // part for every opener that never closes, which is quadratic. 600,000 openers
  // is 3 MB and would run for minutes that way.
  describe('on a crafted part', () => {
    const budgetMs = 1500;

    it('scans many unclosed openers in linear time', () => {
      const started = Date.now();

      expect(elementsOf('<p>'.repeat(600_000), 'p')).toEqual([]);
      expect(Date.now() - started).toBeLessThan(budgetMs);
    });

    it('scans many opening tags that never end in linear time', () => {
      const started = Date.now();

      expect(elementsOf('<p '.repeat(600_000), 'p')).toEqual([]);
      expect(Date.now() - started).toBeLessThan(budgetMs);
    });

    it('scans many self-closing elements in linear time', () => {
      const started = Date.now();

      expect(elementsOf('<c r="A1"/>'.repeat(300_000), 'c')).toEqual([]);
      expect(Date.now() - started).toBeLessThan(budgetMs);
    });
  });
});
