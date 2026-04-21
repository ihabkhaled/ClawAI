import { ExtractionProfile } from '../../enums/extraction-profile.enum';
import { TableExtractor } from '../table.extractor';

describe('TableExtractor', () => {
  const extractor = new TableExtractor();

  it('returns empty tables when page has none', () => {
    const out = extractor.extract({
      html: '<p>no tables here</p>',
      url: 'https://t',
      profile: ExtractionProfile.TABLE,
    });
    expect(out.structured.tables).toEqual([]);
    expect(out.text).toContain('no tables here');
  });

  it('parses a simple table with header + rows', () => {
    const html = `
      <table>
        <tr><th>Name</th><th>Price</th></tr>
        <tr><td>Pro</td><td>$20</td></tr>
        <tr><td>Team</td><td>$50</td></tr>
      </table>`;
    const out = extractor.extract({ html, url: 'https://t', profile: ExtractionProfile.TABLE });
    const tables = out.structured.tables as Array<{ headers: string[]; rows: string[][] }>;
    expect(tables.length).toBe(1);
    expect(tables[0]?.headers).toEqual(['Name', 'Price']);
    expect(tables[0]?.rows).toEqual([
      ['Pro', '$20'],
      ['Team', '$50'],
    ]);
  });

  it('parses multiple tables on one page', () => {
    const html = `
      <table><tr><td>a1</td></tr></table>
      <table><tr><td>b1</td></tr></table>`;
    const out = extractor.extract({ html, url: 'https://t', profile: ExtractionProfile.TABLE });
    const tables = out.structured.tables as unknown[];
    expect(tables.length).toBe(2);
  });

  it('caps at SCRAPE_TABLE_MAX_TABLES', () => {
    const html = '<table><tr><td>x</td></tr></table>'.repeat(30);
    const out = extractor.extract({ html, url: 'https://t', profile: ExtractionProfile.TABLE });
    const tables = out.structured.tables as unknown[];
    expect(tables.length).toBe(20);
  });

  it('treats a row with only <th> as headers and subsequent <tr> as data', () => {
    const html = '<table><tr><th>A</th></tr><tr><td>1</td></tr></table>';
    const out = extractor.extract({ html, url: 'https://t', profile: ExtractionProfile.TABLE });
    const tables = out.structured.tables as Array<{ headers: string[]; rows: string[][] }>;
    expect(tables[0]?.headers).toEqual(['A']);
    expect(tables[0]?.rows).toEqual([['1']]);
  });
});
