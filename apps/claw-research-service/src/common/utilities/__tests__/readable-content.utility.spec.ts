import { extractReadableContent } from '../readable-content.utility';

/**
 * Runs the REAL @mozilla/readability + linkedom + turndown, not mocks — the
 * point of this wrapper is that the three libraries work together under our
 * module format (rule 13 §6: CommonJS packages behind a default import).
 */
describe('extractReadableContent', () => {
  const article = `<html><head><title>How TLS fingerprinting works</title></head><body>
    <header><nav>Menu Home About</nav></header>
    <main><article>
      <h1>How TLS fingerprinting works</h1>
      ${'<p>A server can tell clients apart by the shape of their TLS ClientHello message. '.repeat(10)}</p>
      <h2>Why it matters</h2>
      <ul><li>First point</li><li>Second point</li></ul>
      <pre><code>curl https://example.com</code></pre>
    </article></main>
    <footer>Footer links and legal text</footer>
    <script>tracking()</script></body></html>`;

  it('returns the article as Markdown without navigation, footer or scripts', () => {
    const result = extractReadableContent(article, 'https://blog.example/tls');

    expect(result).not.toBeNull();
    expect(result?.markdown).toContain('## Why it matters');
    expect(result?.markdown).toMatch(/-\s+First point/u);
    expect(result?.markdown).toContain('```');
    expect(result?.markdown).not.toContain('Footer links');
    expect(result?.markdown).not.toContain('tracking()');
    expect(result?.textLength).toBeGreaterThan(500);
  });

  it('returns null for a page with no article and for empty input', () => {
    expect(
      extractReadableContent('<html><body><p>Hi</p></body></html>', 'https://x.example/'),
    ).toBeNull();
    expect(extractReadableContent('', 'https://x.example/')).toBeNull();
  });

  it('resolves ./relative, /root-relative and bare links but leaves absolute and #fragment ones', () => {
    const html = `<html><body><article>${'<p>Long enough article text for Readability to accept it. '.repeat(10)}
      <a href="./Data_scraping">a</a> <a href="/wiki/B">b</a> <a href="c">c</a>
      <a href="https://other.example/x">x</a> <a href="#notes">n</a></p></article></body></html>`;

    const markdown =
      extractReadableContent(html, 'https://en.wikipedia.org/wiki/Web_scraping')?.markdown ?? '';

    expect(markdown).toContain('](https://en.wikipedia.org/wiki/Data_scraping)');
    expect(markdown).toContain('](https://en.wikipedia.org/wiki/B)');
    expect(markdown).toContain('](https://en.wikipedia.org/wiki/c)');
    expect(markdown).toContain('](https://other.example/x)');
    expect(markdown).toContain('](#notes)');
  });

  it('never throws on malformed markup or a bad base URL', () => {
    expect(() => extractReadableContent('<<<not html', 'not a url')).not.toThrow();
  });
});
