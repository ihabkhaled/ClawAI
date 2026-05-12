import { Injectable, Logger } from '@nestjs/common';

// v3 round 4 (2026-05-12) — Prompt 06 polish: anti-loop heuristics +
// signature append. Sits between the AI-action approval queue (which
// validated risk/policy) and the Gmail adapter (which talks to the
// Gmail API). Pure-function checks + a small in-memory dedup window
// for thread-level anti-loop.

export type ComposeContext = {
  // Required for both send and createDraft.
  to: string;
  subject: string;
  body: string;
  // Set on REPLY_EMAIL and reply-as-draft. Used for thread-level dedup.
  threadId?: string;
  // Optional: the In-Reply-To header value (when known from the original
  // message). Used as a stronger dedup key than threadId alone.
  inReplyTo?: string;
  // Optional signature to append. When present and non-empty, separated
  // by "\n\n-- \n" per RFC 3676 §4.3.
  signature?: string;
};

export type ComposeDecision =
  | { allowed: true; body: string; subject: string }
  | { allowed: false; reason: ComposeRejectReason; detail: string };

export type ComposeRejectReason =
  | 'SUBJECT_LOOP'
  | 'TO_IS_MAILER_DAEMON'
  | 'DUPLICATE_WITHIN_WINDOW';

// Mailer-daemon style addresses we never auto-reply to. Lower-cased
// before matching.
const MAILER_DAEMON_PATTERNS = [
  'mailer-daemon@',
  'noreply@',
  'no-reply@',
  'do-not-reply@',
  'donotreply@',
  'postmaster@',
  'auto-confirm@',
  'auto-reply@',
  'bounces@',
  'bounce@',
  'mail-daemon@',
];

// "Re:" / "RE:" / "re:" / unicode Re: prefix repeats. Five+ "Re:" is
// almost always a stuck ping-pong between two auto-responders.
const SUBJECT_RE_LOOP_THRESHOLD = 5;
const SUBJECT_RE_REGEX = /\b(re|rs|sv|aw|antw)\s*:/gi;

const DEDUP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const DEDUP_KEY_MAX = 5000; // cap memory; prune oldest on overflow

@Injectable()
export class GmailComposeHelper {
  private readonly logger = new Logger(GmailComposeHelper.name);
  // Map<dedup-key, sentAtMs>. Key is `${userId}:${threadId|inReplyTo|to+subject}`.
  // Best-effort, single-process. Multi-replica → Redis.
  private readonly recent = new Map<string, number>();

  /**
   * Validate the compose intent. Returns either a normalized body + subject
   * (signature appended if any) or a typed rejection reason.
   *
   * `userId` is required for dedup so two different users replying to the
   * same thread don't collide.
   */
  evaluate(userId: string, ctx: ComposeContext): ComposeDecision {
    const subjectLoop = this.countReprefixes(ctx.subject);
    if (subjectLoop >= SUBJECT_RE_LOOP_THRESHOLD) {
      this.logger.warn(
        `evaluate: subject Re:-loop count=${String(subjectLoop)} threshold=${String(SUBJECT_RE_LOOP_THRESHOLD)} → BLOCKED`,
      );
      return {
        allowed: false,
        reason: 'SUBJECT_LOOP',
        detail: `Subject has ${String(subjectLoop)} Re:-prefixes; refusing to auto-reply`,
      };
    }
    const toLower = ctx.to.toLowerCase();
    const matchedDaemon = MAILER_DAEMON_PATTERNS.find((p) => toLower.includes(p));
    if (matchedDaemon !== undefined) {
      this.logger.warn(`evaluate: to=${ctx.to} matches mailer-daemon pattern → BLOCKED`);
      return {
        allowed: false,
        reason: 'TO_IS_MAILER_DAEMON',
        detail: `Recipient '${ctx.to}' matches no-reply pattern '${matchedDaemon}'`,
      };
    }
    const dedupKey = this.makeKey(userId, ctx);
    const recent = this.recent.get(dedupKey);
    const now = Date.now();
    if (recent !== undefined && now - recent < DEDUP_WINDOW_MS) {
      const ageSeconds = Math.floor((now - recent) / 1000);
      this.logger.warn(
        `evaluate: duplicate compose key=${dedupKey} ageSec=${String(ageSeconds)} → BLOCKED`,
      );
      return {
        allowed: false,
        reason: 'DUPLICATE_WITHIN_WINDOW',
        detail: `Already sent to this thread/recipient ${String(ageSeconds)}s ago`,
      };
    }
    this.recordSend(dedupKey, now);
    return {
      allowed: true,
      body: this.appendSignature(ctx.body, ctx.signature),
      subject: ctx.subject,
    };
  }

  // Test/operational seam: clear the dedup window.
  reset(): void {
    this.recent.clear();
  }

  private countReprefixes(subject: string): number {
    return (subject.match(SUBJECT_RE_REGEX) ?? []).length;
  }

  private makeKey(userId: string, ctx: ComposeContext): string {
    // Strongest signal first: In-Reply-To (RFC 5322 §3.6.4 unique-message-id).
    if (ctx.inReplyTo !== undefined && ctx.inReplyTo.length > 0) {
      return `u:${userId}|imt:${ctx.inReplyTo}`;
    }
    if (ctx.threadId !== undefined && ctx.threadId.length > 0) {
      return `u:${userId}|tid:${ctx.threadId}`;
    }
    // No thread context — fall back to recipient+subject.
    return `u:${userId}|to:${ctx.to.toLowerCase()}|s:${ctx.subject.slice(0, 200)}`;
  }

  private recordSend(key: string, atMs: number): void {
    if (this.recent.size >= DEDUP_KEY_MAX) {
      // Drop the oldest 10% — bounded LRU lite.
      const cutoff = atMs - DEDUP_WINDOW_MS;
      for (const [k, ts] of this.recent) {
        if (ts < cutoff) this.recent.delete(k);
        if (this.recent.size < DEDUP_KEY_MAX * 0.9) break;
      }
    }
    this.recent.set(key, atMs);
  }

  private appendSignature(body: string, signature: string | undefined): string {
    if (signature === undefined || signature.trim().length === 0) return body;
    // RFC 3676 §4.3 signature separator: "-- " (note trailing space).
    // If body already ends with the separator, don't double it.
    if (body.includes('\n-- \n')) return body;
    return `${body.replace(/\s+$/, '')}\n\n-- \n${signature.trim()}`;
  }
}
