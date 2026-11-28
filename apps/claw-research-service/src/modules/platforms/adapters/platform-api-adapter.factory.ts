import { HttpStatus, Injectable } from '@nestjs/common';

import { ResearchErrorCode } from '../../../common/enums/research-error-code.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import { PlatformApiKind } from '../../../generated/prisma';
import { ArxivAdapter } from './arxiv.adapter';
import { CrossrefAdapter } from './crossref.adapter';
import { GithubAdapter } from './github.adapter';
import { HnAlgoliaAdapter } from './hn-algolia.adapter';
import { OpenAlexAdapter } from './openalex.adapter';
import { PubMedAdapter } from './pubmed.adapter';
import { SemanticScholarAdapter } from './semantic-scholar.adapter';
import { StackExchangeAdapter } from './stack-exchange.adapter';
import { WikipediaAdapter } from './wikipedia.adapter';
import type { PlatformApiAdapter } from './platform-api-adapter.interface';

/** One adapter per `PlatformApiKind`; an unknown kind is a 400, never a guess. */
@Injectable()
export class PlatformApiAdapterFactory {
  constructor(
    private readonly openAlex: OpenAlexAdapter,
    private readonly semanticScholar: SemanticScholarAdapter,
    private readonly pubMed: PubMedAdapter,
    private readonly crossref: CrossrefAdapter,
    private readonly arxiv: ArxivAdapter,
    private readonly stackExchange: StackExchangeAdapter,
    private readonly hnAlgolia: HnAlgoliaAdapter,
    private readonly github: GithubAdapter,
    private readonly wikipedia: WikipediaAdapter,
  ) {}

  getAdapter(kind: PlatformApiKind): PlatformApiAdapter {
    switch (kind) {
      case PlatformApiKind.OPENALEX:
        return this.openAlex;
      case PlatformApiKind.SEMANTIC_SCHOLAR:
        return this.semanticScholar;
      case PlatformApiKind.PUBMED:
        return this.pubMed;
      case PlatformApiKind.CROSSREF:
        return this.crossref;
      case PlatformApiKind.ARXIV:
        return this.arxiv;
      case PlatformApiKind.STACK_EXCHANGE:
        return this.stackExchange;
      case PlatformApiKind.HN_ALGOLIA:
        return this.hnAlgolia;
      case PlatformApiKind.GITHUB:
        return this.github;
      case PlatformApiKind.WIKIPEDIA:
        return this.wikipedia;
      default:
        throw new BusinessException(
          'research.platform.unsupported_api_kind',
          ResearchErrorCode.UNSUPPORTED_PROVIDER,
          HttpStatus.BAD_REQUEST,
          { kind: String(kind) },
        );
    }
  }
}
