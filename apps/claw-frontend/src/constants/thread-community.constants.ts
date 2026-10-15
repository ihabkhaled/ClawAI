import { UserNotificationKind } from '@claw/shared-types';
import {
  AtSign,
  Bell,
  CheckCheck,
  CircleCheck,
  CircleX,
  FilePenLine,
  Heart,
  MessageCircle,
  MessageSquareReply,
  ServerCog,
  type LucideIcon,
} from 'lucide-react';

export const THREAD_COMMENT_MAX_LENGTH = 5000;
export const THREAD_COMMENTS_PAGE_SIZE = 20;
export const THREAD_COMMENTS_STALE_MS = 30_000;
/** The `#comment-<id>` anchor scheme shared with the notification links. */
export const THREAD_COMMENT_ANCHOR_PREFIX = 'comment-';
/** At most this many page requests while looking for a linked comment (roots, then replies). */
export const THREAD_COMMENT_LOCATE_MAX_PAGES = 10;
/** How long a linked comment stays highlighted. */
export const THREAD_COMMENT_HIGHLIGHT_MS = 4000;
/** A mention is a name of at most this many characters; longer runs are plain text. */
export const THREAD_MENTION_MAX_LENGTH = 40;
export const THREAD_AUTHOR_INITIALS_MAX = 2;

/** One icon per notification kind, so a row is recognisable before it is read. */
export const NOTIFICATION_KIND_ICONS: Readonly<Record<UserNotificationKind, LucideIcon>> = {
  [UserNotificationKind.THREAD_READY_FOR_REVIEW]: Bell,
  [UserNotificationKind.THREAD_PUBLISHED]: Bell,
  [UserNotificationKind.THREAD_FAILED]: Bell,
  [UserNotificationKind.THREAD_COMMENTED]: MessageCircle,
  [UserNotificationKind.THREAD_COMMENT_REPLIED]: MessageSquareReply,
  [UserNotificationKind.THREAD_MENTIONED]: AtSign,
  [UserNotificationKind.THREAD_REACTED]: Heart,
  [UserNotificationKind.THREAD_COMMENT_REACTED]: Heart,
  [UserNotificationKind.THREAD_CHANGE_REQUESTED]: FilePenLine,
  [UserNotificationKind.THREAD_CHANGE_ACCEPTED]: CircleCheck,
  [UserNotificationKind.THREAD_CHANGE_APPLIED]: CheckCheck,
  [UserNotificationKind.THREAD_CHANGE_DECLINED]: CircleX,
  [UserNotificationKind.MCP_SERVER_APPROVED]: ServerCog,
  [UserNotificationKind.MCP_SERVER_REJECTED]: ServerCog,
};
