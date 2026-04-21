import { ExtractionProfile } from '../../enums/extraction-profile.enum';
import { ArticleExtractor } from '../article.extractor';

describe('ArticleExtractor', () => {
  const extractor = new ArticleExtractor();

  it('pulls <title>', () => {
    const out = extractor.extract({
      html: '<html><head><title>Hello World</title></head><body><p>x</p></body></html>',
      url: 'https://example.com/a',
      profile: ExtractionProfile.ARTICLE,
    });
    expect(out.title).toBe('Hello World');
    expect(out.profile).toBe(ExtractionProfile.ARTICLE);
  });

  it('strips <script>, <style>, <nav>, <footer>', () => {
    const html = `
      <html><body>
        <nav><a href="/x">menu</a></nav>
        <script>alert(1)</script>
        <style>.a{color:red}</style>
        <article><p>real content here</p></article>
        <footer>copyright</footer>
      </body></html>`;
    const out = extractor.extract({ html, url: 'https://x', profile: ExtractionProfile.ARTICLE });
    expect(out.text).toContain('real content here');
    expect(out.text).not.toContain('menu');
    expect(out.text).not.toContain('alert');
    expect(out.text).not.toContain('copyright');
    expect(out.text).not.toContain('.a{');
  });

  it('captures paragraphs into structured.paragraphs', () => {
    const html = '<html><body><p>first</p><p>second</p><p>   </p><p>third</p></body></html>';
    const out = extractor.extract({ html, url: 'https://x', profile: ExtractionProfile.ARTICLE });
    expect(out.structured.paragraphs).toEqual(['first', 'second', 'third']);
  });

  it('captures headings into structured.headings', () => {
    const html = '<h1>A</h1><h2>B</h2><h3>C</h3><p>x</p>';
    const out = extractor.extract({ html, url: 'https://x', profile: ExtractionProfile.ARTICLE });
    expect(out.structured.headings).toEqual([
      { level: 1, text: 'A' },
      { level: 2, text: 'B' },
      { level: 3, text: 'C' },
    ]);
  });

  it('truncates very long bodies (caps at SCRAPE_TEXT_MAX_CHARS)', () => {
    const big = 'x'.repeat(80_000);
    const out = extractor.extract({
      html: `<p>${big}</p>`,
      url: 'https://x',
      profile: ExtractionProfile.ARTICLE,
    });
    expect(out.text.length).toBeLessThanOrEqual(50_000);
    expect(out.warnings).toContain('text_truncated');
  });
});
