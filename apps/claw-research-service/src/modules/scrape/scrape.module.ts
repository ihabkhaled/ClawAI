import { Module } from '@nestjs/common';

import { ArticleExtractor } from './adapters/article.extractor';
import { DocsExtractor } from './adapters/docs.extractor';
import { GenericHtmlExtractor } from './adapters/generic-html.extractor';
import { ScrapeAdapterFactory } from './adapters/scrape-adapter.factory';
import { TableExtractor } from './adapters/table.extractor';
import { ScrapeService } from './services/scrape.service';

@Module({
  providers: [
    ArticleExtractor,
    DocsExtractor,
    TableExtractor,
    GenericHtmlExtractor,
    ScrapeAdapterFactory,
    ScrapeService,
  ],
  exports: [ScrapeService],
})
export class ScrapeModule {}
