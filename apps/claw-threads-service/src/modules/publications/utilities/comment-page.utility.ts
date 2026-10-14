import type { ListPublicationCommentsQuery } from '../dto/list-publication-comments.dto';
import type { PublicCommentPage } from '../types/publication-comments.types';

/** What a comment read returns when the database failed unexpectedly: an empty, well-formed page. */
export function emptyCommentPage(query: ListPublicationCommentsQuery): PublicCommentPage {
  return {
    items: [],
    page: query.page,
    pageSize: query.pageSize,
    total: 0,
    commentTotal: 0,
    totalPages: 0,
  };
}
