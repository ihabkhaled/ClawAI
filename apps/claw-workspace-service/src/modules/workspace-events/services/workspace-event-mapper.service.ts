import { Injectable } from '@nestjs/common';

import { WorkspaceCanonicalEventType } from '../../../common/enums/workspace-canonical-event-type.enum';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import type { CanonicalEventMapping, WebhookJsonBody } from '../types/workspace-event.types';
import { asRecord, bool, num, parseDate, str } from '../utilities/webhook-payload-field.utility';

/**
 * Maps a raw webhook delivery (provider + raw event-type signal + parsed
 * body) to the canonical event vocabulary. Returns null when this
 * provider/rawEventType combination isn't mapped yet — the pack explicitly
 * says "do not require every provider to support every event," so an
 * unmapped delivery is dropped (still recorded in WebhookDelivery, just not
 * promoted to a canonical WorkspaceEvent) rather than force-fit.
 *
 * `rawEventType` is the same value WebhookReceiverManager already extracted
 * at verification time (header-based for GitHub/GitLab/Bitbucket, null for
 * Slack/Jira/Figma — those three are derived from the body instead, per
 * each provider's real webhook envelope shape).
 */
@Injectable()
export class WorkspaceEventMapperService {
  map(
    provider: WorkspaceProvider,
    rawEventType: string | null,
    body: WebhookJsonBody,
  ): CanonicalEventMapping | null {
    switch (provider) {
      case WorkspaceProvider.GITHUB:
        return this.mapGithub(rawEventType, asRecord(body));
      case WorkspaceProvider.GITLAB:
        return this.mapGitlab(rawEventType, asRecord(body));
      case WorkspaceProvider.BITBUCKET:
        return this.mapBitbucket(rawEventType, asRecord(body));
      case WorkspaceProvider.JIRA:
        return this.mapJira(asRecord(body));
      case WorkspaceProvider.SLACK:
        return this.mapSlack(asRecord(body));
      case WorkspaceProvider.FIGMA:
        return this.mapFigma(asRecord(body));
      default:
        return null;
    }
  }

  // GitHub sends the event name in the X-GitHub-Event header (already
  // extracted as rawEventType) and the specific action in body.action.
  private mapGithub(
    rawEventType: string | null,
    body: Record<string, unknown>,
  ): CanonicalEventMapping | null {
    switch (rawEventType) {
      case 'pull_request':
        return this.mapGithubPullRequest(body);
      case 'pull_request_review':
        return this.mapGithubPullRequestReview(body);
      case 'issues':
        return this.mapGithubIssues(body);
      case 'issue_comment':
        return this.mapGithubIssueComment(body);
      case 'check_run':
        return this.mapGithubCheckRun(body);
      default:
        return null;
    }
  }

  private mapGithubPullRequest(body: Record<string, unknown>): CanonicalEventMapping | null {
    const action = str(body['action']);
    const pr = asRecord((body['pull_request'] as WebhookJsonBody | undefined) ?? {});
    const base = {
      resourceType: WorkspaceObjectType.PULL_REQUEST,
      resourceExternalId: num(pr['number']) !== null ? String(pr['number']) : null,
      occurredAt: parseDate(pr['updated_at']),
    };
    if (action === 'closed' && bool(pr['merged'])) {
      return { eventType: WorkspaceCanonicalEventType.PR_MERGED, ...base };
    }
    if (action === 'opened') {
      return { eventType: WorkspaceCanonicalEventType.PR_OPENED, ...base };
    }
    if (action === 'synchronize' || action === 'edited' || action === 'reopened') {
      return { eventType: WorkspaceCanonicalEventType.PR_UPDATED, ...base };
    }
    return null;
  }

  private mapGithubPullRequestReview(body: Record<string, unknown>): CanonicalEventMapping | null {
    if (str(body['action']) !== 'submitted') return null;
    const review = asRecord((body['review'] as WebhookJsonBody | undefined) ?? {});
    return {
      eventType: WorkspaceCanonicalEventType.PR_REVIEWED,
      resourceType: WorkspaceObjectType.PULL_REQUEST,
      resourceExternalId: num(review['id']) !== null ? String(review['id']) : null,
      occurredAt: parseDate(review['submitted_at']),
    };
  }

  private mapGithubIssues(body: Record<string, unknown>): CanonicalEventMapping | null {
    const action = str(body['action']);
    const issue = asRecord((body['issue'] as WebhookJsonBody | undefined) ?? {});
    const base = {
      resourceType: WorkspaceObjectType.ISSUE,
      resourceExternalId: num(issue['number']) !== null ? String(issue['number']) : null,
      occurredAt: parseDate(issue['updated_at']),
    };
    if (action === 'opened') {
      return { eventType: WorkspaceCanonicalEventType.ISSUE_CREATED, ...base };
    }
    if (['edited', 'closed', 'reopened', 'labeled', 'unlabeled'].includes(action ?? '')) {
      return { eventType: WorkspaceCanonicalEventType.ISSUE_UPDATED, ...base };
    }
    return null;
  }

  private mapGithubIssueComment(body: Record<string, unknown>): CanonicalEventMapping | null {
    if (str(body['action']) !== 'created') return null;
    const comment = asRecord((body['comment'] as WebhookJsonBody | undefined) ?? {});
    return {
      eventType: WorkspaceCanonicalEventType.COMMENT_CREATED,
      resourceType: WorkspaceObjectType.COMMENT,
      resourceExternalId: num(comment['id']) !== null ? String(comment['id']) : null,
      occurredAt: parseDate(comment['created_at']),
    };
  }

  private mapGithubCheckRun(body: Record<string, unknown>): CanonicalEventMapping | null {
    if (str(body['action']) !== 'completed') return null;
    const checkRun = asRecord((body['check_run'] as WebhookJsonBody | undefined) ?? {});
    const conclusion = str(checkRun['conclusion']);
    const base = {
      resourceType: null,
      resourceExternalId: num(checkRun['id']) !== null ? String(checkRun['id']) : null,
      occurredAt: parseDate(checkRun['completed_at']),
    };
    if (conclusion === 'success')
      return { eventType: WorkspaceCanonicalEventType.CI_SUCCEEDED, ...base };
    if (conclusion === 'failure')
      return { eventType: WorkspaceCanonicalEventType.CI_FAILED, ...base };
    return null;
  }

  // GitLab sends the event category in the X-Gitlab-Event header (e.g.
  // "Merge Request Hook") and the specific action in
  // body.object_attributes.action.
  private mapGitlab(
    rawEventType: string | null,
    body: Record<string, unknown>,
  ): CanonicalEventMapping | null {
    switch (rawEventType) {
      case 'Merge Request Hook':
        return this.mapGitlabMergeRequest(body);
      case 'Issue Hook':
        return this.mapGitlabIssue(body);
      case 'Note Hook':
        return this.mapGitlabNote(body);
      case 'Pipeline Hook':
        return this.mapGitlabPipeline(body);
      default:
        return null;
    }
  }

  private mapGitlabMergeRequest(body: Record<string, unknown>): CanonicalEventMapping | null {
    const attrs = asRecord((body['object_attributes'] as WebhookJsonBody | undefined) ?? {});
    const action = str(attrs['action']);
    const base = {
      resourceType: WorkspaceObjectType.PULL_REQUEST,
      resourceExternalId: num(attrs['iid']) !== null ? String(attrs['iid']) : null,
      occurredAt: parseDate(attrs['updated_at']),
    };
    if (action === 'open') return { eventType: WorkspaceCanonicalEventType.PR_OPENED, ...base };
    if (action === 'merge') return { eventType: WorkspaceCanonicalEventType.PR_MERGED, ...base };
    if (action === 'update' || action === 'reopen') {
      return { eventType: WorkspaceCanonicalEventType.PR_UPDATED, ...base };
    }
    return null;
  }

  private mapGitlabIssue(body: Record<string, unknown>): CanonicalEventMapping | null {
    const attrs = asRecord((body['object_attributes'] as WebhookJsonBody | undefined) ?? {});
    const action = str(attrs['action']);
    const base = {
      resourceType: WorkspaceObjectType.ISSUE,
      resourceExternalId: num(attrs['iid']) !== null ? String(attrs['iid']) : null,
      occurredAt: parseDate(attrs['updated_at']),
    };
    if (action === 'open') return { eventType: WorkspaceCanonicalEventType.ISSUE_CREATED, ...base };
    if (['update', 'close', 'reopen'].includes(action ?? '')) {
      return { eventType: WorkspaceCanonicalEventType.ISSUE_UPDATED, ...base };
    }
    return null;
  }

  private mapGitlabNote(body: Record<string, unknown>): CanonicalEventMapping {
    const attrs = asRecord((body['object_attributes'] as WebhookJsonBody | undefined) ?? {});
    return {
      eventType: WorkspaceCanonicalEventType.COMMENT_CREATED,
      resourceType: WorkspaceObjectType.COMMENT,
      resourceExternalId: num(attrs['id']) !== null ? String(attrs['id']) : null,
      occurredAt: parseDate(attrs['created_at']),
    };
  }

  private mapGitlabPipeline(body: Record<string, unknown>): CanonicalEventMapping | null {
    const attrs = asRecord((body['object_attributes'] as WebhookJsonBody | undefined) ?? {});
    const status = str(attrs['status']);
    const base = {
      resourceType: null,
      resourceExternalId: num(attrs['id']) !== null ? String(attrs['id']) : null,
      occurredAt: parseDate(attrs['finished_at']),
    };
    if (status === 'success')
      return { eventType: WorkspaceCanonicalEventType.CI_SUCCEEDED, ...base };
    if (status === 'failed') return { eventType: WorkspaceCanonicalEventType.CI_FAILED, ...base };
    return null;
  }

  // Bitbucket sends the fully-qualified action in the X-Event-Key header
  // (e.g. "pullrequest:created") — no separate action field in the body.
  private mapBitbucket(
    rawEventType: string | null,
    body: Record<string, unknown>,
  ): CanonicalEventMapping | null {
    if (rawEventType === null) return null;
    if (rawEventType.startsWith('pullrequest:')) {
      return this.mapBitbucketPullRequest(rawEventType, body);
    }
    if (rawEventType.startsWith('issue:')) {
      return this.mapBitbucketIssue(rawEventType, body);
    }
    return null;
  }

  private mapBitbucketPullRequest(
    rawEventType: string,
    body: Record<string, unknown>,
  ): CanonicalEventMapping | null {
    const pr = asRecord((body['pullrequest'] as WebhookJsonBody | undefined) ?? {});
    const base = {
      resourceType: WorkspaceObjectType.PULL_REQUEST,
      resourceExternalId: num(pr['id']) !== null ? String(pr['id']) : null,
      occurredAt: parseDate(pr['updated_on']),
    };
    if (rawEventType === 'pullrequest:created')
      return { eventType: WorkspaceCanonicalEventType.PR_OPENED, ...base };
    if (rawEventType === 'pullrequest:fulfilled')
      return { eventType: WorkspaceCanonicalEventType.PR_MERGED, ...base };
    if (rawEventType === 'pullrequest:approved')
      return { eventType: WorkspaceCanonicalEventType.PR_REVIEWED, ...base };
    if (rawEventType === 'pullrequest:updated')
      return { eventType: WorkspaceCanonicalEventType.PR_UPDATED, ...base };
    if (rawEventType === 'pullrequest:comment_created') {
      return this.mapBitbucketComment(body);
    }
    return null;
  }

  private mapBitbucketIssue(
    rawEventType: string,
    body: Record<string, unknown>,
  ): CanonicalEventMapping | null {
    const issue = asRecord((body['issue'] as WebhookJsonBody | undefined) ?? {});
    const base = {
      resourceType: WorkspaceObjectType.ISSUE,
      resourceExternalId: num(issue['id']) !== null ? String(issue['id']) : null,
      occurredAt: parseDate(issue['updated_on']),
    };
    if (rawEventType === 'issue:created')
      return { eventType: WorkspaceCanonicalEventType.ISSUE_CREATED, ...base };
    if (rawEventType === 'issue:updated')
      return { eventType: WorkspaceCanonicalEventType.ISSUE_UPDATED, ...base };
    if (rawEventType === 'issue:comment_created') {
      return this.mapBitbucketComment(body);
    }
    return null;
  }

  private mapBitbucketComment(body: Record<string, unknown>): CanonicalEventMapping {
    const comment = asRecord((body['comment'] as WebhookJsonBody | undefined) ?? {});
    return {
      eventType: WorkspaceCanonicalEventType.COMMENT_CREATED,
      resourceType: WorkspaceObjectType.COMMENT,
      resourceExternalId: num(comment['id']) !== null ? String(comment['id']) : null,
      occurredAt: parseDate(comment['created_on']),
    };
  }

  // Atlassian Connect webhooks carry the event name in body.webhookEvent —
  // the verifier doesn't extract an eventType header for Jira (see
  // webhook-signature-verifiers.utility.ts), so it's read from the body here.
  private mapJira(body: Record<string, unknown>): CanonicalEventMapping | null {
    const webhookEvent = str(body['webhookEvent']);
    const issue = asRecord((body['issue'] as WebhookJsonBody | undefined) ?? {});
    const timestampMs = num(body['timestamp']);
    const occurredAt = timestampMs !== null ? new Date(timestampMs) : null;

    if (webhookEvent === 'jira:issue_created') {
      return {
        eventType: WorkspaceCanonicalEventType.TICKET_CREATED,
        resourceType: WorkspaceObjectType.TICKET,
        resourceExternalId: str(issue['key']),
        occurredAt,
      };
    }
    if (webhookEvent === 'jira:issue_updated') {
      return {
        eventType: WorkspaceCanonicalEventType.TICKET_STATUS_CHANGED,
        resourceType: WorkspaceObjectType.TICKET,
        resourceExternalId: str(issue['key']),
        occurredAt,
      };
    }
    if (webhookEvent === 'comment_created') {
      const comment = asRecord((body['comment'] as WebhookJsonBody | undefined) ?? {});
      return {
        eventType: WorkspaceCanonicalEventType.COMMENT_CREATED,
        resourceType: WorkspaceObjectType.COMMENT,
        resourceExternalId: str(comment['id']),
        occurredAt,
      };
    }
    return null;
  }

  // Slack's Events API wraps the real event in an envelope:
  // { type: "event_callback", event: { type: "message" | "app_mention", ... } }.
  // No eventType header exists for Slack (see webhook-signature-verifiers),
  // so this reads event.type from the body.
  private mapSlack(body: Record<string, unknown>): CanonicalEventMapping | null {
    const event = asRecord((body['event'] as WebhookJsonBody | undefined) ?? {});
    const innerType = str(event['type']);
    const ts = str(event['event_ts']) ?? str(event['ts']);
    const occurredAt = ts !== null ? new Date(Number.parseFloat(ts) * 1000) : null;

    if (innerType === 'app_mention') {
      return {
        eventType: WorkspaceCanonicalEventType.MENTION_RECEIVED,
        resourceType: WorkspaceObjectType.MESSAGE,
        resourceExternalId: ts,
        occurredAt,
      };
    }
    if (innerType === 'message') {
      // Slack re-delivers edits/deletes as "message" with a subtype; only a
      // plain new message (no subtype) is a real MESSAGE_RECEIVED.
      if (str(event['subtype']) !== null) return null;
      return {
        eventType: WorkspaceCanonicalEventType.MESSAGE_RECEIVED,
        resourceType: WorkspaceObjectType.MESSAGE,
        resourceExternalId: ts,
        occurredAt,
      };
    }
    return null;
  }

  private mapFigma(body: Record<string, unknown>): CanonicalEventMapping | null {
    const eventType = str(body['event_type']);
    if (eventType === 'FILE_COMMENT') {
      return {
        eventType: WorkspaceCanonicalEventType.COMMENT_CREATED,
        resourceType: WorkspaceObjectType.COMMENT,
        resourceExternalId: str(body['comment_id']),
        occurredAt: parseDate(body['created_at']),
      };
    }
    return null;
  }
}
