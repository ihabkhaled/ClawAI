import {
  DERIVED_DESCRIPTION_MAX_ENTRIES,
  DERIVED_DESCRIPTION_TTL_MS,
} from '../../constants/attachment-awareness.constants';
import { DerivedImageDescriptionStore } from '../derived-image-description-store.service';

const observation = (fileId: string) => ({
  fileId,
  filename: `${fileId}.png`,
  helperProvider: 'GEMINI',
  helperModel: 'gemini-2.5-flash',
  text: `described ${fileId}`,
});

describe('DerivedImageDescriptionStore', () => {
  it('returns what was stored for the same user and file only', () => {
    const store = new DerivedImageDescriptionStore();
    store.set('u1', observation('a'));

    expect(store.get('u1', 'a')?.text).toBe('described a');
    expect(store.get('u2', 'a')).toBeUndefined();
    expect(store.get('u1', 'b')).toBeUndefined();
  });

  it('forgets a description after its time to live', () => {
    const store = new DerivedImageDescriptionStore();
    store.set('u1', observation('a'), 1_000);

    expect(store.get('u1', 'a', 1_000 + DERIVED_DESCRIPTION_TTL_MS - 1)).toBeDefined();
    expect(store.get('u1', 'a', 1_000 + DERIVED_DESCRIPTION_TTL_MS)).toBeUndefined();
  });

  it('is bounded: the oldest entry goes first', () => {
    const store = new DerivedImageDescriptionStore();
    for (let index = 0; index <= DERIVED_DESCRIPTION_MAX_ENTRIES; index += 1) {
      store.set('u1', observation(`f${String(index)}`));
    }

    expect(store.get('u1', 'f0')).toBeUndefined();
    expect(store.get('u1', `f${String(DERIVED_DESCRIPTION_MAX_ENTRIES)}`)).toBeDefined();
  });
});
