import { type Prisma, PublicationStatus } from '../../../generated/prisma';
import { PUBLIC_REVISION_WHERE } from '../constants/public-revision.constants';

/** A publication readers can open, comment on and react to: published with a public revision. */
export function publicPublicationWhere(slug: string): Prisma.ThreadPublicationWhereInput {
  return {
    slug,
    status: PublicationStatus.PUBLISHED,
    revisions: { some: PUBLIC_REVISION_WHERE },
  };
}
