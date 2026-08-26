import { WorkspaceCanonicalEventType } from '../../../../common/enums/workspace-canonical-event-type.enum';
import { WorkspaceObjectType } from '../../../../common/enums/workspace-object-type.enum';
import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import { WorkspaceEventMapperService } from '../workspace-event-mapper.service';

describe('WorkspaceEventMapperService', () => {
  let mapper: WorkspaceEventMapperService;

  beforeEach(() => {
    mapper = new WorkspaceEventMapperService();
  });

  describe('GitHub', () => {
    it('maps pull_request/opened to PR_OPENED', () => {
      const result = mapper.map(WorkspaceProvider.GITHUB, 'pull_request', {
        action: 'opened',
        pull_request: { number: 42, merged: false, updated_at: '2026-08-16T10:00:00Z' },
      });
      expect(result).toEqual({
        eventType: WorkspaceCanonicalEventType.PR_OPENED,
        resourceType: WorkspaceObjectType.PULL_REQUEST,
        resourceExternalId: '42',
        occurredAt: new Date('2026-08-16T10:00:00Z'),
      });
    });

    it('maps pull_request/closed+merged=true to PR_MERGED, not PR_UPDATED', () => {
      const result = mapper.map(WorkspaceProvider.GITHUB, 'pull_request', {
        action: 'closed',
        pull_request: { number: 42, merged: true, updated_at: '2026-08-16T10:00:00Z' },
      });
      expect(result?.eventType).toBe(WorkspaceCanonicalEventType.PR_MERGED);
    });

    it('drops pull_request/closed+merged=false (a real PR close is not a canonical event yet)', () => {
      const result = mapper.map(WorkspaceProvider.GITHUB, 'pull_request', {
        action: 'closed',
        pull_request: { number: 42, merged: false },
      });
      expect(result).toBeNull();
    });

    it('maps pull_request/synchronize to PR_UPDATED', () => {
      const result = mapper.map(WorkspaceProvider.GITHUB, 'pull_request', {
        action: 'synchronize',
        pull_request: { number: 7 },
      });
      expect(result?.eventType).toBe(WorkspaceCanonicalEventType.PR_UPDATED);
    });

    it('maps pull_request_review/submitted to PR_REVIEWED', () => {
      const result = mapper.map(WorkspaceProvider.GITHUB, 'pull_request_review', {
        action: 'submitted',
        review: { id: 99, submitted_at: '2026-08-16T11:00:00Z' },
      });
      expect(result?.eventType).toBe(WorkspaceCanonicalEventType.PR_REVIEWED);
    });

    it('maps issues/opened to ISSUE_CREATED and issues/labeled to ISSUE_UPDATED', () => {
      const created = mapper.map(WorkspaceProvider.GITHUB, 'issues', {
        action: 'opened',
        issue: { number: 5 },
      });
      const updated = mapper.map(WorkspaceProvider.GITHUB, 'issues', {
        action: 'labeled',
        issue: { number: 5 },
      });
      expect(created?.eventType).toBe(WorkspaceCanonicalEventType.ISSUE_CREATED);
      expect(updated?.eventType).toBe(WorkspaceCanonicalEventType.ISSUE_UPDATED);
    });

    it('maps issue_comment/created to COMMENT_CREATED', () => {
      const result = mapper.map(WorkspaceProvider.GITHUB, 'issue_comment', {
        action: 'created',
        comment: { id: 123, created_at: '2026-08-16T12:00:00Z' },
      });
      expect(result?.eventType).toBe(WorkspaceCanonicalEventType.COMMENT_CREATED);
      expect(result?.resourceExternalId).toBe('123');
    });

    it('maps check_run/completed conclusion=success/failure to CI_SUCCEEDED/CI_FAILED', () => {
      const success = mapper.map(WorkspaceProvider.GITHUB, 'check_run', {
        action: 'completed',
        check_run: { id: 1, conclusion: 'success' },
      });
      const failure = mapper.map(WorkspaceProvider.GITHUB, 'check_run', {
        action: 'completed',
        check_run: { id: 1, conclusion: 'failure' },
      });
      expect(success?.eventType).toBe(WorkspaceCanonicalEventType.CI_SUCCEEDED);
      expect(failure?.eventType).toBe(WorkspaceCanonicalEventType.CI_FAILED);
    });

    it('returns null for an unmapped GitHub event type', () => {
      expect(mapper.map(WorkspaceProvider.GITHUB, 'push', { ref: 'refs/heads/main' })).toBeNull();
    });
  });

  describe('GitLab', () => {
    it('maps Merge Request Hook action=open/merge/update to PR_OPENED/PR_MERGED/PR_UPDATED', () => {
      const open = mapper.map(WorkspaceProvider.GITLAB, 'Merge Request Hook', {
        object_attributes: { action: 'open', iid: 3 },
      });
      const merged = mapper.map(WorkspaceProvider.GITLAB, 'Merge Request Hook', {
        object_attributes: { action: 'merge', iid: 3 },
      });
      const updated = mapper.map(WorkspaceProvider.GITLAB, 'Merge Request Hook', {
        object_attributes: { action: 'update', iid: 3 },
      });
      expect(open?.eventType).toBe(WorkspaceCanonicalEventType.PR_OPENED);
      expect(merged?.eventType).toBe(WorkspaceCanonicalEventType.PR_MERGED);
      expect(updated?.eventType).toBe(WorkspaceCanonicalEventType.PR_UPDATED);
    });

    it('maps Issue Hook action=open/close to ISSUE_CREATED/ISSUE_UPDATED', () => {
      const created = mapper.map(WorkspaceProvider.GITLAB, 'Issue Hook', {
        object_attributes: { action: 'open', iid: 9 },
      });
      const closed = mapper.map(WorkspaceProvider.GITLAB, 'Issue Hook', {
        object_attributes: { action: 'close', iid: 9 },
      });
      expect(created?.eventType).toBe(WorkspaceCanonicalEventType.ISSUE_CREATED);
      expect(closed?.eventType).toBe(WorkspaceCanonicalEventType.ISSUE_UPDATED);
    });

    it('maps Note Hook to COMMENT_CREATED', () => {
      const result = mapper.map(WorkspaceProvider.GITLAB, 'Note Hook', {
        object_attributes: { id: 55, created_at: '2026-08-16T09:00:00Z' },
      });
      expect(result?.eventType).toBe(WorkspaceCanonicalEventType.COMMENT_CREATED);
    });

    it('maps Pipeline Hook status=success/failed to CI_SUCCEEDED/CI_FAILED', () => {
      const success = mapper.map(WorkspaceProvider.GITLAB, 'Pipeline Hook', {
        object_attributes: { id: 1, status: 'success' },
      });
      const failed = mapper.map(WorkspaceProvider.GITLAB, 'Pipeline Hook', {
        object_attributes: { id: 1, status: 'failed' },
      });
      expect(success?.eventType).toBe(WorkspaceCanonicalEventType.CI_SUCCEEDED);
      expect(failed?.eventType).toBe(WorkspaceCanonicalEventType.CI_FAILED);
    });
  });

  describe('Bitbucket', () => {
    it('maps pullrequest:created/fulfilled/approved/updated', () => {
      const created = mapper.map(WorkspaceProvider.BITBUCKET, 'pullrequest:created', {
        pullrequest: { id: 1 },
      });
      const merged = mapper.map(WorkspaceProvider.BITBUCKET, 'pullrequest:fulfilled', {
        pullrequest: { id: 1 },
      });
      const approved = mapper.map(WorkspaceProvider.BITBUCKET, 'pullrequest:approved', {
        pullrequest: { id: 1 },
      });
      const updated = mapper.map(WorkspaceProvider.BITBUCKET, 'pullrequest:updated', {
        pullrequest: { id: 1 },
      });
      expect(created?.eventType).toBe(WorkspaceCanonicalEventType.PR_OPENED);
      expect(merged?.eventType).toBe(WorkspaceCanonicalEventType.PR_MERGED);
      expect(approved?.eventType).toBe(WorkspaceCanonicalEventType.PR_REVIEWED);
      expect(updated?.eventType).toBe(WorkspaceCanonicalEventType.PR_UPDATED);
    });

    it('maps issue:created/updated and comment_created variants', () => {
      const created = mapper.map(WorkspaceProvider.BITBUCKET, 'issue:created', {
        issue: { id: 2 },
      });
      const commented = mapper.map(WorkspaceProvider.BITBUCKET, 'issue:comment_created', {
        issue: { id: 2 },
        comment: { id: 77 },
      });
      expect(created?.eventType).toBe(WorkspaceCanonicalEventType.ISSUE_CREATED);
      expect(commented?.eventType).toBe(WorkspaceCanonicalEventType.COMMENT_CREATED);
    });

    it('returns null when rawEventType is null (Bitbucket verifier can still yield null)', () => {
      expect(mapper.map(WorkspaceProvider.BITBUCKET, null, {})).toBeNull();
    });
  });

  describe('Jira', () => {
    it('maps jira:issue_created/updated to TICKET_CREATED/TICKET_STATUS_CHANGED', () => {
      const created = mapper.map(WorkspaceProvider.JIRA, null, {
        webhookEvent: 'jira:issue_created',
        issue: { key: 'CLAW-1' },
        timestamp: 1_755_000_000_000,
      });
      const updated = mapper.map(WorkspaceProvider.JIRA, null, {
        webhookEvent: 'jira:issue_updated',
        issue: { key: 'CLAW-1' },
      });
      expect(created).toEqual({
        eventType: WorkspaceCanonicalEventType.TICKET_CREATED,
        resourceType: WorkspaceObjectType.TICKET,
        resourceExternalId: 'CLAW-1',
        occurredAt: new Date(1_755_000_000_000),
      });
      expect(updated?.eventType).toBe(WorkspaceCanonicalEventType.TICKET_STATUS_CHANGED);
    });

    it('maps comment_created to COMMENT_CREATED', () => {
      const result = mapper.map(WorkspaceProvider.JIRA, null, {
        webhookEvent: 'comment_created',
        comment: { id: '10001' },
      });
      expect(result?.eventType).toBe(WorkspaceCanonicalEventType.COMMENT_CREATED);
    });
  });

  describe('Slack', () => {
    it('maps event.type=message (no subtype) to MESSAGE_RECEIVED', () => {
      const result = mapper.map(WorkspaceProvider.SLACK, null, {
        event: { type: 'message', ts: '1755000000.000100' },
      });
      expect(result?.eventType).toBe(WorkspaceCanonicalEventType.MESSAGE_RECEIVED);
    });

    it('drops message events that carry a subtype (edits/deletes, not a new message)', () => {
      const result = mapper.map(WorkspaceProvider.SLACK, null, {
        event: { type: 'message', subtype: 'message_changed', ts: '1755000000.000100' },
      });
      expect(result).toBeNull();
    });

    it('maps event.type=app_mention to MENTION_RECEIVED', () => {
      const result = mapper.map(WorkspaceProvider.SLACK, null, {
        event: { type: 'app_mention', event_ts: '1755000000.000200' },
      });
      expect(result?.eventType).toBe(WorkspaceCanonicalEventType.MENTION_RECEIVED);
    });
  });

  describe('Figma', () => {
    it('maps FILE_COMMENT to COMMENT_CREATED', () => {
      const result = mapper.map(WorkspaceProvider.FIGMA, null, {
        event_type: 'FILE_COMMENT',
        comment_id: 'c1',
        created_at: '2026-08-16T13:00:00Z',
      });
      expect(result?.eventType).toBe(WorkspaceCanonicalEventType.COMMENT_CREATED);
    });

    it('returns null for an unmapped Figma event_type', () => {
      expect(
        mapper.map(WorkspaceProvider.FIGMA, null, { event_type: 'LIBRARY_PUBLISH' }),
      ).toBeNull();
    });
  });

  it('returns null for a provider with no mapping implemented at all', () => {
    expect(mapper.map(WorkspaceProvider.CLICKUP, 'taskCreated', {})).toBeNull();
  });

  it('does not throw on an array body (defensive against malformed webhook JSON)', () => {
    expect(() => mapper.map(WorkspaceProvider.GITHUB, 'pull_request', [])).not.toThrow();
  });
});
