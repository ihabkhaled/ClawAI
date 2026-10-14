import { PublicationCommentStatus } from '../../../generated/prisma';
import type { ReplyPlacement, ReplyTarget } from '../types/publication-comments.types';

/**
 * A reply may target only a VISIBLE comment of the SAME publication. Its parent is that comment and
 * its root is the target's own root, or the target itself when the target is top-level, so storage
 * is flat (one level) while the conversation can go as deep as people reply. A missing, hidden,
 * deleted or foreign target is `null` and the caller answers the same 404 for all of them.
 */
export function placeReply(
  target: ReplyTarget | null,
  publicationId: string,
): ReplyPlacement | null {
  if (
    target?.publicationId !== publicationId ||
    target.status !== PublicationCommentStatus.VISIBLE
  ) {
    return null;
  }
  return {
    parentId: target.id,
    rootId: target.rootId ?? target.id,
    replyToUserId: target.authorId,
  };
}
