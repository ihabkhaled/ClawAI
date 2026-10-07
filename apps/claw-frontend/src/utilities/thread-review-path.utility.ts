import { ROUTES } from '@/constants/routes.constants';

/** The owner's page for one publication: progress, draft, publish, export. */
export function threadReviewPath(publicationId: string): string {
  return `${ROUTES.THREAD_PUBLICATIONS}/review/${encodeURIComponent(publicationId)}`;
}
