import { ContextSaveStatus } from '../../../../common/enums';
import { CONTEXT_SAVE_SAVING_STALE_MS } from '../../constants/save-intent.constants';
import { hasContextSave } from '../context-save-note.utility';
import {
  contextSaveOf,
  isContextSaveSettled,
  isSavingAbandoned,
} from '../context-save-record.utility';
import { contextSaveModelNote } from '../save-intent.utility';

describe('contextSaveOf', () => {
  it('reads the record off an answer', () => {
    const record = { status: ContextSaveStatus.PROPOSED };

    expect(contextSaveOf({ metadata: { contextSave: record, other: 1 } })).toEqual(record);
  });

  it.each([
    null,
    undefined,
    'x',
    3,
    [],
    {},
    { contextSave: null },
    { contextSave: [] },
    { contextSave: {} },
  ])('is undefined when there is no usable record: %j', (metadata) => {
    expect(contextSaveOf({ metadata } as never)).toBeUndefined();
  });

  it('hasContextSave agrees', () => {
    expect(hasContextSave({ metadata: { contextSave: { status: 'DISMISSED' } } })).toBe(true);
    expect(hasContextSave({ metadata: { other: 1 } })).toBe(false);
  });
});

describe('isContextSaveSettled — SAVED, DISMISSED and FAILED are final', () => {
  it.each([
    [ContextSaveStatus.SAVED, true],
    [ContextSaveStatus.DISMISSED, true],
    [ContextSaveStatus.FAILED, true],
    [ContextSaveStatus.PROPOSED, false],
    [ContextSaveStatus.NEEDS_PACK_CHOICE, false],
    [ContextSaveStatus.SAVING, false],
  ])('%s -> %s', (status, settled) => {
    expect(isContextSaveSettled({ status })).toBe(settled);
  });
});

describe('isSavingAbandoned', () => {
  const now = Date.parse('2026-10-13T12:00:00.000Z');
  const at = (ms: number): string => new Date(now - ms).toISOString();

  it('is true only for a SAVING claim older than the window', () => {
    const saving = ContextSaveStatus.SAVING;

    expect(
      isSavingAbandoned({ status: saving, savingSince: at(CONTEXT_SAVE_SAVING_STALE_MS + 1) }, now),
    ).toBe(true);
    expect(
      isSavingAbandoned({ status: saving, savingSince: at(CONTEXT_SAVE_SAVING_STALE_MS) }, now),
    ).toBe(false);
    expect(isSavingAbandoned({ status: saving, savingSince: at(1_000) }, now)).toBe(false);
  });

  it('a SAVING record with no claim time is never taken over (no atomic guard exists)', () => {
    expect(isSavingAbandoned({ status: ContextSaveStatus.SAVING }, now)).toBe(false);
  });

  it('a SAVING record with an unreadable claim time is abandoned', () => {
    expect(isSavingAbandoned({ status: ContextSaveStatus.SAVING, savingSince: 'soon' }, now)).toBe(
      true,
    );
  });

  it('is never true for another status', () => {
    expect(
      isSavingAbandoned({ status: ContextSaveStatus.PROPOSED, savingSince: at(1e9) }, now),
    ).toBe(false);
    expect(isSavingAbandoned({ status: ContextSaveStatus.DISMISSED }, now)).toBe(false);
  });

  it('the window is two minutes', () => {
    expect(CONTEXT_SAVE_SAVING_STALE_MS).toBe(120_000);
  });
});

describe('contextSaveModelNote on a half-saved proposal', () => {
  it('names the saved half with its link and keeps the rest pending', () => {
    const note = contextSaveModelNote({
      status: ContextSaveStatus.PROPOSED,
      memory: { id: 'm1', type: 'FACT', preview: 'A fact', link: '/memory?id=m1' },
      proposal: {
        memory: null,
        pack: { source: 'USER_TEXT', content: 'x', packId: null, packName: null, newPackName: 'D' },
        options: [],
      },
    } as never);

    expect(note).toContain('PARTLY done');
    expect(note).toContain('/memory?id=m1');
    expect(note).not.toContain('NOTHING has been saved');
  });
});

describe('contextSaveModelNote on a dismissed proposal', () => {
  it('says plainly that nothing was saved and gives no link', () => {
    const note = contextSaveModelNote({ status: ContextSaveStatus.DISMISSED });

    expect(note).toContain('NOTHING was saved');
    expect(note).not.toMatch(/already done|\/memory\?|\/context\?/u);
  });
});
