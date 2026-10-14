import { THREAD_COMMENT_ANCHOR_PREFIX } from '@/constants/thread-community.constants';
import { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import type {
  ThreadCommentNode,
  ThreadCommentsData,
  ThreadReactionCounts,
} from '@/types/thread-community.types';

/** Oldest first, each id once: a page of replies may overlap what the first page already held. */
export function mergeReplies(
  current: ThreadCommentNode[],
  incoming: ThreadCommentNode[],
): ThreadCommentNode[] {
  const byId = new Map<string, ThreadCommentNode>();
  for (const reply of [...current, ...incoming]) {
    byId.set(reply.id, reply);
  }
  return [...byId.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

/** The comment the URL fragment points at (`#comment-<id>`), or null. */
export function commentIdFromHash(hash: string): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw.startsWith(THREAD_COMMENT_ANCHOR_PREFIX)) {
    return null;
  }
  const id = raw.slice(THREAD_COMMENT_ANCHOR_PREFIX.length);
  return /^[\w-]{1,64}$/u.test(id) ? id : null;
}

export function commentAnchorId(commentId: string): string {
  return `${THREAD_COMMENT_ANCHOR_PREFIX}${commentId}`;
}

/** What the counts become the moment a reaction is chosen (or cleared with `null`). */
export function applyReaction(
  current: ThreadReactionCounts,
  next: ThreadPublicationReaction | null,
): ThreadReactionCounts {
  let likes = current.likes;
  let dislikes = current.dislikes;
  if (current.viewerReaction === ThreadPublicationReaction.Like) {
    likes -= 1;
  }
  if (current.viewerReaction === ThreadPublicationReaction.Dislike) {
    dislikes -= 1;
  }
  if (next === ThreadPublicationReaction.Like) {
    likes += 1;
  }
  if (next === ThreadPublicationReaction.Dislike) {
    dislikes += 1;
  }
  return { likes: Math.max(0, likes), dislikes: Math.max(0, dislikes), viewerReaction: next };
}

/** Which reaction a click on `value` asks for: the same one again clears it. */
export function nextReaction(
  current: ThreadPublicationReaction | null,
  value: ThreadPublicationReaction,
): ThreadPublicationReaction | null {
  return current === value ? null : value;
}

function mapNode(
  node: ThreadCommentNode,
  commentId: string,
  update: (found: ThreadCommentNode) => ThreadCommentNode,
): ThreadCommentNode {
  if (node.id === commentId) {
    return update(node);
  }
  if (node.replies.length === 0) {
    return node;
  }
  return { ...node, replies: node.replies.map((reply) => mapNode(reply, commentId, update)) };
}

/** A copy of the cached pages with one comment (root or reply) changed. Never mutates. */
export function updateComment(
  data: ThreadCommentsData,
  commentId: string,
  update: (found: ThreadCommentNode) => ThreadCommentNode,
): ThreadCommentsData {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((node) => mapNode(node, commentId, update)),
    })),
  };
}

export function findComment(data: ThreadCommentsData, commentId: string): ThreadCommentNode | null {
  for (const page of data.pages) {
    for (const root of page.items) {
      if (root.id === commentId) {
        return root;
      }
      const reply = root.replies.find((candidate) => candidate.id === commentId);
      if (reply) {
        return reply;
      }
    }
  }
  return null;
}

/** Adds a freshly posted comment: a new root at the top, or a reply at the end of its root. */
export function insertComment(
  data: ThreadCommentsData,
  created: ThreadCommentNode,
): ThreadCommentsData {
  const rootId = created.rootId ?? created.parentId;
  if (rootId === null) {
    const [first, ...rest] = data.pages;
    if (!first) {
      return data;
    }
    return { ...data, pages: [{ ...first, items: [created, ...first.items] }, ...rest] };
  }
  return updateComment(data, rootId, (root) => ({
    ...root,
    replyCount: root.replyCount + 1,
    replies: mergeReplies(root.replies, [created]),
  }));
}

/** How many replies of a root are not on screen yet. */
export function remainingReplies(root: ThreadCommentNode): number {
  return Math.max(0, root.replyCount - root.replies.length);
}

/** Each root once, newest page first: a comment posted while paging can shift a root onto two pages. */
export function uniqueRoots(roots: ThreadCommentNode[]): ThreadCommentNode[] {
  const seen = new Set<string>();
  return roots.filter((root) => {
    if (seen.has(root.id)) {
      return false;
    }
    seen.add(root.id);
    return true;
  });
}
