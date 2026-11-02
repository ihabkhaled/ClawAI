import { Injectable, NotFoundException } from '@nestjs/common';
import { Locale } from '@claw/shared-types';

import { AuthorIdentityService } from '../../author-identity/services/author-identity.service';
import { PublicationTranslationsRepository } from '../../publication-translations/repositories/publication-translations.repository';
import { PublicationsRepository } from '../repositories/publications.repository';
import type { PublicPublication } from '../types/publication.types';

/** The public Thread page: the publication plus the publisher's name (never an id or an email). */
@Injectable()
export class PublicationPublicReadService {
  constructor(
    private readonly publications: PublicationsRepository,
    private readonly translations: PublicationTranslationsRepository,
    private readonly identity: AuthorIdentityService,
  ) {}

  /**
   * `lang` asks for a translated copy. It is served only while a current copy exists; otherwise the
   * Thread comes back in its own language, so a link never breaks while a translation is pending.
   */
  async get(slug: string, lang?: string): Promise<PublicPublication> {
    const found = await this.publications.findPublic(slug);
    if (!found) throw new NotFoundException('Publication not found');
    const { ownerId, publicationId, revision, ...publication } = found;
    const ready = await this.translations.listReadyLocales(publicationId, revision);
    const availableLocales = [publication.contentLocale, ...ready];
    const wanted = Object.values(Locale).find((locale) => locale === lang);
    const copy =
      wanted !== undefined && wanted !== publication.contentLocale && ready.includes(wanted)
        ? await this.translations.findReady(publicationId, wanted, revision)
        : null;
    const owner = await this.identity.resolveOne(ownerId);
    if (copy === null || wanted === undefined) {
      return {
        ...publication,
        owner,
        sourceLocale: publication.contentLocale,
        translated: false,
        availableLocales,
      };
    }
    return {
      ...publication,
      title: copy.title,
      contentLocale: wanted,
      content: { ...publication.content, markdown: copy.markdown },
      owner,
      sourceLocale: publication.contentLocale,
      translated: true,
      availableLocales,
    };
  }
}
