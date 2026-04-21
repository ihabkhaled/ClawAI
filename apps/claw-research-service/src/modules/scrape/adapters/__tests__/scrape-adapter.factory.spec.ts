import { BusinessException } from '../../../../common/errors/business.exception';
import { ResearchErrorCode } from '../../../../common/enums/research-error-code.enum';
import { ExtractionProfile } from '../../enums/extraction-profile.enum';
import { ArticleExtractor } from '../article.extractor';
import { DocsExtractor } from '../docs.extractor';
import { GenericHtmlExtractor } from '../generic-html.extractor';
import { ScrapeAdapterFactory } from '../scrape-adapter.factory';
import { TableExtractor } from '../table.extractor';

describe('ScrapeAdapterFactory', () => {
  const factory = new ScrapeAdapterFactory(
    new ArticleExtractor(),
    new DocsExtractor(),
    new TableExtractor(),
    new GenericHtmlExtractor(),
  );

  it('returns the article extractor for ARTICLE', () => {
    const a = factory.getAdapter(ExtractionProfile.ARTICLE);
    expect(a.profileName).toBe('article');
  });

  it('returns the docs extractor for DOCS', () => {
    const a = factory.getAdapter(ExtractionProfile.DOCS);
    expect(a.profileName).toBe('docs');
  });

  it('returns the table extractor for TABLE', () => {
    const a = factory.getAdapter(ExtractionProfile.TABLE);
    expect(a.profileName).toBe('table');
  });

  it('returns the generic extractor for GENERIC_HTML', () => {
    const a = factory.getAdapter(ExtractionProfile.GENERIC_HTML);
    expect(a.profileName).toBe('generic-html');
  });

  it('throws SCRAPE_UNSUPPORTED_PROFILE for unknown profile kinds', () => {
    try {
      factory.getAdapter('XYZ');
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(BusinessException);
      expect((e as BusinessException).code).toBe(ResearchErrorCode.SCRAPE_UNSUPPORTED_PROFILE);
    }
  });
});
