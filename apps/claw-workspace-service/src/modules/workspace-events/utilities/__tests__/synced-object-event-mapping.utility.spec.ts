import { WorkspaceCanonicalEventType } from '../../../../common/enums/workspace-canonical-event-type.enum';
import { WorkspaceObjectType } from '../../../../common/enums/workspace-object-type.enum';
import { canonicalEventForSyncedObject } from '../synced-object-event-mapping.utility';

describe('canonicalEventForSyncedObject', () => {
  it('maps a brand-new DOCUMENT (createdAt === updatedAt) to DOCUMENT_CREATED', () => {
    const same = new Date('2026-08-16T10:00:00Z');
    const result = canonicalEventForSyncedObject({
      externalId: 'doc-1',
      type: WorkspaceObjectType.DOCUMENT,
      title: 'Doc',
      externalCreatedAt: same,
      externalUpdatedAt: same,
    });
    expect(result?.eventType).toBe(WorkspaceCanonicalEventType.DOCUMENT_CREATED);
  });

  it('maps an edited DOCUMENT (updatedAt after createdAt) to DOCUMENT_UPDATED', () => {
    const result = canonicalEventForSyncedObject({
      externalId: 'doc-1',
      type: WorkspaceObjectType.DOCUMENT,
      title: 'Doc',
      externalCreatedAt: new Date('2026-08-16T09:00:00Z'),
      externalUpdatedAt: new Date('2026-08-16T10:00:00Z'),
    });
    expect(result?.eventType).toBe(WorkspaceCanonicalEventType.DOCUMENT_UPDATED);
  });

  it('maps FILE and SPREADSHEET to FILE_UPDATED regardless of new/edited (no FILE_CREATED in the canonical vocabulary)', () => {
    const file = canonicalEventForSyncedObject({
      externalId: 'f1',
      type: WorkspaceObjectType.FILE,
      title: 'File',
    });
    const sheet = canonicalEventForSyncedObject({
      externalId: 's1',
      type: WorkspaceObjectType.SPREADSHEET,
      title: 'Sheet',
    });
    expect(file?.eventType).toBe(WorkspaceCanonicalEventType.FILE_UPDATED);
    expect(sheet?.eventType).toBe(WorkspaceCanonicalEventType.FILE_UPDATED);
  });

  it('maps EMAIL to EMAIL_RECEIVED', () => {
    const result = canonicalEventForSyncedObject({
      externalId: 'e1',
      type: WorkspaceObjectType.EMAIL,
      title: 'Subject',
    });
    expect(result?.eventType).toBe(WorkspaceCanonicalEventType.EMAIL_RECEIVED);
  });

  it('maps TICKET (only reached for ClickUp — Jira is webhook-covered) to TASK_CREATED/TASK_UPDATED', () => {
    const same = new Date('2026-08-16T10:00:00Z');
    const created = canonicalEventForSyncedObject({
      externalId: 't1',
      type: WorkspaceObjectType.TICKET,
      title: 'Task',
      externalCreatedAt: same,
      externalUpdatedAt: same,
    });
    const updated = canonicalEventForSyncedObject({
      externalId: 't1',
      type: WorkspaceObjectType.TICKET,
      title: 'Task',
      externalCreatedAt: new Date('2026-08-16T09:00:00Z'),
      externalUpdatedAt: new Date('2026-08-16T10:00:00Z'),
    });
    expect(created?.eventType).toBe(WorkspaceCanonicalEventType.TASK_CREATED);
    expect(updated?.eventType).toBe(WorkspaceCanonicalEventType.TASK_UPDATED);
  });

  it('maps a new COMMENT to COMMENT_CREATED but drops an edited comment (created-only, matching the webhook path)', () => {
    const same = new Date('2026-08-16T10:00:00Z');
    const created = canonicalEventForSyncedObject({
      externalId: 'c1',
      type: WorkspaceObjectType.COMMENT,
      title: 'Comment',
      externalCreatedAt: same,
      externalUpdatedAt: same,
    });
    const edited = canonicalEventForSyncedObject({
      externalId: 'c1',
      type: WorkspaceObjectType.COMMENT,
      title: 'Comment',
      externalCreatedAt: new Date('2026-08-16T09:00:00Z'),
      externalUpdatedAt: new Date('2026-08-16T10:00:00Z'),
    });
    expect(created?.eventType).toBe(WorkspaceCanonicalEventType.COMMENT_CREATED);
    expect(edited).toBeNull();
  });

  it('returns null for MEETING (time-relative lifecycle, not sync-detectable) and other unmapped types', () => {
    expect(
      canonicalEventForSyncedObject({
        externalId: 'm1',
        type: WorkspaceObjectType.MEETING,
        title: 'Standup',
      }),
    ).toBeNull();
    expect(
      canonicalEventForSyncedObject({
        externalId: 'p1',
        type: WorkspaceObjectType.PROJECT,
        title: 'Proj',
      }),
    ).toBeNull();
  });
});
