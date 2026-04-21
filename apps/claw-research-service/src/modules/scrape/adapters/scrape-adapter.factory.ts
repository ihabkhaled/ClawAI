import { HttpStatus, Injectable } from '@nestjs/common';

import { ResearchErrorCode } from '../../../common/enums/research-error-code.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import { ExtractionProfile } from '../enums/extraction-profile.enum';
import { ArticleExtractor } from './article.extractor';
import { DocsExtractor } from './docs.extractor';
import { GenericHtmlExtractor } from './generic-html.extractor';
import { TableExtractor } from './table.extractor';
import type { ScrapeAdapter } from './scrape-adapter.interface';

@Injectable()
export class ScrapeAdapterFactory {
  constructor(
    private readonly article: ArticleExtractor,
    private readonly docs: DocsExtractor,
    private readonly table: TableExtractor,
    private readonly generic: GenericHtmlExtractor,
  ) {}

  getAdapter(profile: ExtractionProfile | string): ScrapeAdapter {
    switch (profile as ExtractionProfile) {
      case ExtractionProfile.ARTICLE:
        return this.article;
      case ExtractionProfile.DOCS:
        return this.docs;
      case ExtractionProfile.TABLE:
        return this.table;
      case ExtractionProfile.GENERIC_HTML:
        return this.generic;
      default:
        throw new BusinessException(
          'research.scrape.unsupported_profile',
          ResearchErrorCode.SCRAPE_UNSUPPORTED_PROFILE,
          HttpStatus.BAD_REQUEST,
          { profile },
        );
    }
  }
}
