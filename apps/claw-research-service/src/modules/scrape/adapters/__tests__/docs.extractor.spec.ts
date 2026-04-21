import { ExtractionProfile } from '../../enums/extraction-profile.enum';
import { DocsExtractor } from '../docs.extractor';

describe('DocsExtractor', () => {
  const extractor = new DocsExtractor();

  it('strips sidebars, nav, and table of contents but keeps headings', () => {
    const html = `
      <nav><a>prev</a><a>next</a></nav>
      <aside class="toc">table of contents</aside>
      <main>
        <h1>Install</h1>
        <p>Run npm install</p>
        <h2>Usage</h2>
        <p>Import the library.</p>
      </main>`;
    const out = extractor.extract({ html, url: 'https://d', profile: ExtractionProfile.DOCS });
    expect(out.text).toContain('Run npm install');
    expect(out.text).toContain('Import the library');
    expect(out.text).not.toContain('prev');
    expect(out.text).not.toContain('table of contents');
    expect(out.structured.outline).toEqual([
      { level: 1, text: 'Install' },
      { level: 2, text: 'Usage' },
    ]);
  });

  it('produces empty outline when page has no headings', () => {
    const out = extractor.extract({
      html: '<p>just one paragraph</p>',
      url: 'https://d',
      profile: ExtractionProfile.DOCS,
    });
    expect(out.structured.outline).toEqual([]);
    expect(out.text).toContain('just one paragraph');
  });

  it('caps outline at SCRAPE_DOCS_MAX_HEADINGS', () => {
    const html = Array.from({ length: 150 }, (_, i) => `<h2>H${String(i)}</h2>`).join('');
    const out = extractor.extract({ html, url: 'https://d', profile: ExtractionProfile.DOCS });
    const outline = out.structured.outline as Array<{ level: number; text: string }>;
    expect(outline.length).toBe(100);
  });
});
